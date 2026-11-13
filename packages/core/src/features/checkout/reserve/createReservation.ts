import { checkoutReservations } from "@openmers/db"
import { sql } from "drizzle-orm"
import {
  type AtomicStatement,
  affected,
  guardedInsertStatement,
  type Platform,
  sqlStatement,
} from "../../../platform"
import type { CartData, CartTotals } from "../../cart"
import { newPublicId } from "../../ids"
import { buildUsageStatements } from "../../promotions"
import { reserveStatements, type StockRef, stockOpGuard } from "../../stock"
import { CheckoutError } from "../types"
import { allocateStock, buildSnapshot, type SnapshotInput } from "./buildSnapshot"

export type ReservationSource = "web" | "agent" | "admin" | "api"

export type CreateReservationInput = {
  /** `loadCartData` + `calculate` output; the conditional write is bound to the `version` read. */
  data: CartData
  totals: CartTotals
  paymentMethodId: number
  expiresAt: number
  source?: ReservationSource
} & Pick<SnapshotInput, "consents" | "legalPolicyVersion" | "attribution">

function assertReservable(data: CartData, totals: CartTotals): void {
  if (data.cart.status !== "active") throw new CheckoutError("CART_CHANGED", "sepet aktif değil")
  if (data.lines.length === 0) throw new CheckoutError("INVALID_INPUT", "sepet boş")
  if (totals.unavailable.length > 0) throw new CheckoutError("INVALID_INPUT", "fiyatsız satır var")
  if (totals.shipping.needsShipping && totals.shipping.methodId === null) {
    throw new CheckoutError("INVALID_INPUT", "kargo yöntemi seçilmedi")
  }
}

/**
 * Reservation (05-sepet §3): one `atomic()`, all statements conditional, all-or-nothing without
 * raising:
 * 1. `INSERT checkout_reservations ... WHERE` the cart is still at the `version` read and
 *    `active` + every line has enough sellable stock (`stockOpGuard`).
 * 2. Promotion usage (`buildUsageStatements`), guarded by the reservation existing as `active`
 *    and by the limits. That guard looks up the reservation row, so it cannot go into statement
 *    1's condition; if it fails, statement 3 deletes the new reservation (no usage row written).
 * 4. Stock reservation + movements, extra guard "reservation exists as `active`": nothing is
 *    written if 1 skipped or 3 deleted.
 * On failure the cause is told apart: 3 deleted -> coupon; 1 skipped -> one read round checks
 * the cart version, unchanged means stock.
 */
export async function createReservation(
  ctx: { platform: Pick<Platform, "atomic" | "batch">; now: number },
  input: CreateReservationInput,
): Promise<{ publicId: string }> {
  const { data, totals, now } = { ...input, now: ctx.now }
  assertReservable(data, totals)
  const allocation = allocateStock(data)
  const publicId = newPublicId("rsv_")
  const resId = sql`(SELECT "id" FROM "checkout_reservations" WHERE "public_id" = ${publicId})`
  const ref: StockRef = { type: "reservation", id: resId }
  const cartHolds = sql`EXISTS (SELECT 1 FROM "carts" WHERE "id" = ${data.cart.id}
    AND "version" = ${data.cart.version} AND "status" = 'active')`
  const stockHolds = allocation.length > 0 ? stockOpGuard("reserve", allocation, ref) : sql`1 = 1`

  const insert = guardedInsertStatement(
    checkoutReservations,
    {
      publicId,
      cartId: data.cart.id,
      channelId: data.cart.channelId,
      snapshot: buildSnapshot({ ...input, allocation, now }),
      paymentMethodId: input.paymentMethodId,
      status: "active",
      expiresAt: input.expiresAt,
      source: input.source ?? "web",
      createdAt: now,
      updatedAt: now,
    },
    sql`${cartHolds} AND ${stockHolds}`,
  )
  const usage = buildUsageStatements({
    results: totals.promotions,
    reservationId: resId,
    customerId: data.cart.customerId,
    now,
  })
  const undo: AtomicStatement[] =
    usage.expected === 0
      ? []
      : [
          sqlStatement(sql`DELETE FROM "checkout_reservations" WHERE "public_id" = ${publicId}
            AND (SELECT count(*) FROM "promotion_usage" u WHERE u."reservation_id" = ${resId})
              < ${usage.expected}`),
        ]
  const active = sql`EXISTS (SELECT 1 FROM "checkout_reservations"
    WHERE "public_id" = ${publicId} AND "status" = 'active')`
  const stock = allocation.length > 0 ? reserveStatements(allocation, ref, now, active) : []

  const stmts = [insert, ...usage.statements, ...undo, ...stock]
  const result = await ctx.platform.atomic(stmts)
  if (!affected(result, 0)) throw await whyNot(ctx.platform, data)
  if (undo.length > 0 && affected(result, 1 + usage.statements.length)) {
    throw new CheckoutError("COUPON_EXHAUSTED", "kupon kullanım sınırı doldu")
  }
  return { publicId }
}

/** Extra read round: cart version changed -> cart; otherwise the stock condition failed. */
async function whyNot(p: Pick<Platform, "batch">, data: CartData): Promise<CheckoutError> {
  const [rows = []] = await p.batch([
    sqlStatement(sql`SELECT "version", "status" FROM "carts" WHERE "id" = ${data.cart.id}`),
  ])
  const row = rows[0]
  if (!row || Number(row.version) !== data.cart.version || row.status !== "active") {
    return new CheckoutError("CART_CHANGED", "sepet değişti")
  }
  return new CheckoutError("INSUFFICIENT_STOCK", "stok yetersiz")
}
