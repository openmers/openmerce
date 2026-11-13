import { orderEvents, orders, payments } from "@openmers/db"
import { sql } from "drizzle-orm"
import {
  type AtomicStatement,
  affected,
  guardedInsertStatement,
  type Platform,
  sqlStatement,
} from "../../../platform"
import { newPublicId } from "../../ids"
import {
  buildCounterStatement,
  DEFAULT_ORDER_NUMBER,
  numberPeriod,
  type OrderNumberFormat,
} from "../../orders"
import { enqueueStatement } from "../../outbox"
import { derivePaymentState } from "../../payments/state/derivePaymentState"
import { CheckoutError, OPEN_RESERVATION_STATUSES } from "../types"
import { LATE_RESERVATION_STATUSES, lateStock } from "./lateSettlement"
import { orderChildStatements } from "./orderStatements"
import { parseSnapshot, type SettleSnapshot } from "./snapshot"

export type SettlePayment = {
  amount: number
  currency: string
  /** Provider reference; unique per method (`payments_provider_reference_uq`). */
  reference: string | null
  state: "authorized" | "settled"
  /** Defaults to the reservation's method. */
  methodId?: number
  statementDescriptor?: string | null
}

export type SettleInput = {
  reservationPublicId: string
  /** Omitted for methods that settle without money (cash on delivery, credit terms). */
  payment?: SettlePayment
  /** Guest customer row created by checkout when the snapshot has none. */
  customerId?: number
  /** Defaults to the channel's `default_lang`. */
  lang?: string
  numberFormat?: OrderNumberFormat
}

export type SettleResult = {
  orderPublicId: string
  number: string
  /** `false`: another trigger (webhook, return page, reconcile) settled it first. */
  created: boolean
  stockException: boolean
}

export type SettleCtx = { platform: Pick<Platform, "atomic" | "batch" | "db">; now: number }

type Reservation = {
  id: number
  status: string
  snapshot: SettleSnapshot
  channelId: number
  cartId: number
  methodId: number
}

async function readState(p: Pick<Platform, "batch">, publicId: string) {
  const [res = [], ord = []] = await p.batch([
    sqlStatement(sql`SELECT "id", "status", "snapshot", "channel_id", "cart_id", "payment_method_id"
      FROM "checkout_reservations" WHERE "public_id" = ${publicId}`),
    sqlStatement(sql`SELECT o."public_id", o."number", o."stock_exception" FROM "orders" o
      JOIN "checkout_reservations" r ON r."id" = o."reservation_id" WHERE r."public_id" = ${publicId}`),
  ])
  const r = res[0]
  const o = ord[0]
  const reservation: Reservation | null = r
    ? {
        id: Number(r.id),
        status: String(r.status),
        snapshot: parseSnapshot(r.snapshot),
        channelId: Number(r.channel_id),
        cartId: Number(r.cart_id),
        methodId: Number(r.payment_method_id),
      }
    : null
  const order = o
    ? {
        orderPublicId: String(o.public_id),
        number: String(o.number),
        stockException: !!o.stock_exception,
      }
    : null
  return { reservation, order }
}

/**
 * Settlement (05-sepet §5, 21.9): webhook, return page and reconciliation all call this. One
 * `atomic()`: counter + `INSERT orders … ON CONFLICT(reservation_id) DO NOTHING` carrying a fresh
 * `settlement_token`, both bound to "no order yet and the reservation is in this path's states";
 * every side write (lines, payment, coupon usage, outbox, cart, reservation) is bound to "the
 * order carries my token". A second or concurrent trigger writes nothing and gets the winner's
 * order. A reservation already released goes the late path (`lateSettlement.ts`).
 */
export async function settle(ctx: SettleCtx, input: SettleInput): Promise<SettleResult> {
  let created = false
  for (let attempt = 0; attempt < 3; attempt++) {
    const { reservation, order } = await readState(ctx.platform, input.reservationPublicId)
    if (!reservation) throw new CheckoutError("NOT_FOUND", "reservation not found")
    if (order) return { ...order, created }
    const { payment } = input
    const snap = reservation.snapshot
    if (payment && (payment.amount !== snap.totals.gross || payment.currency !== snap.currency)) {
      throw new CheckoutError("PAYMENT_MISMATCH", "payment does not match the reservation")
    }
    const stmts = buildSettlement(ctx, reservation, input)
    created = affected(await ctx.platform.atomic(stmts), 1)
  }
  throw new CheckoutError("CONFLICT", "reservation changed during settlement")
}

function buildSettlement(ctx: SettleCtx, res: Reservation, input: SettleInput): AtomicStatement[] {
  const { now } = ctx
  const snap = res.snapshot
  const late = !(OPEN_RESERVATION_STATUSES as readonly string[]).includes(res.status)
  if (late && !(LATE_RESERVATION_STATUSES as readonly string[]).includes(res.status)) {
    throw new CheckoutError("CONFLICT", "settled reservation without an order")
  }
  const customerId = input.customerId ?? snap.customerId
  if (customerId === null) throw new CheckoutError("INVALID_INPUT", "reservation has no customer")
  const statuses = sql.join(
    (late ? LATE_RESERVATION_STATUSES : OPEN_RESERVATION_STATUSES).map((s) => sql`${s}`),
    sql`, `,
  )
  const token = crypto.randomUUID()
  const orderPublicId = newPublicId("ord_")
  const R = res.id
  const fresh = sql`EXISTS (SELECT 1 FROM "checkout_reservations" WHERE "id" = ${R}
      AND "status" IN (${statuses}))
    AND NOT EXISTS (SELECT 1 FROM "orders" WHERE "reservation_id" = ${R})`
  const won = sql`EXISTS (SELECT 1 FROM "orders" WHERE "reservation_id" = ${R}
    AND "settlement_token" = ${token})`
  const orderId = sql`(SELECT "id" FROM "orders" WHERE "public_id" = ${orderPublicId})`
  const counter = buildCounterStatement({
    channelId: res.channelId,
    period: numberPeriod(now, input.numberFormat ?? DEFAULT_ORDER_NUMBER),
    now,
    when: fresh,
    format: input.numberFormat,
  })
  const stock = late
    ? lateStock(snap.allocation, orderId, won, now)
    : { stockException: false as const, statements: [] }
  const lang =
    input.lang ?? sql`(SELECT "default_lang" FROM "channels" WHERE "id" = ${res.channelId})`
  const pay = input.payment
  const insert = guardedInsertStatement(
    orders,
    {
      publicId: orderPublicId,
      number: counter.number,
      channelId: res.channelId,
      customerId,
      companyId: snap.companyId,
      reservationId: R,
      source: sql`(SELECT "source" FROM "checkout_reservations" WHERE "id" = ${R})`,
      settlementToken: token,
      currency: snap.currency,
      subtotalNet: snap.totals.net - snap.shipping.net,
      taxTotal: snap.totals.tax,
      totalGross: snap.totals.gross,
      discountTotal: snap.totals.discount,
      shippingTotal: snap.shipping.gross,
      shippingAddress: snap.addresses.shipping ?? undefined,
      billingAddress: snap.addresses.billing ?? undefined,
      shippingRegion: (snap.addresses.shipping?.region as string | undefined) ?? null,
      paymentStatus: derivePaymentState(
        snap.totals.gross,
        pay ? [{ state: pay.state, amount: pay.amount, refunded: 0 }] : [],
      ),
      lang,
      legalSnapshot: { legalPolicyVersion: snap.legalPolicyVersion, consents: snap.consents },
      stockException: stock.stockException,
      hasPersonalization: snap.lines.some((l) => l.personalized),
      placedAt: now,
      updatedAt: now,
    },
    fresh,
  )
  return [
    counter.statement,
    { ...insert, sql: `${insert.sql} on conflict ("reservation_id") do nothing` },
    ...orderChildStatements(snap, orderId, won, lang),
    ...(pay
      ? [
          guardedInsertStatement(
            payments,
            {
              publicId: newPublicId("pay_"),
              orderId,
              paymentMethodId: pay.methodId ?? res.methodId,
              amount: pay.amount,
              currency: pay.currency,
              state: pay.state,
              providerReference: pay.reference,
              statementDescriptor: pay.statementDescriptor ?? null,
              createdAt: now,
              updatedAt: now,
            },
            won,
          ),
        ]
      : []),
    ...stock.statements,
    sqlStatement(sql`UPDATE "promotion_usage" SET "order_id" = ${orderId}
      WHERE "reservation_id" = ${R} AND "order_id" IS NULL AND ${won}`),
    sqlStatement(sql`UPDATE "carts" SET "status" = 'closed', "version" = "version" + 1,
      "updated_at" = ${now} WHERE "id" = ${res.cartId} AND ${won}`),
    guardedInsertStatement(
      orderEvents,
      { orderId, kind: "placed", toState: "placed", data: { late }, createdAt: now },
      won,
    ),
    enqueueStatement(
      ctx.platform.db,
      {
        kind: "event",
        event: "order.placed",
        payload: { order: orderPublicId, reservation: input.reservationPublicId, late },
      },
      now,
      won,
    ),
    sqlStatement(sql`UPDATE "checkout_reservations" SET "status" = 'settled', "updated_at" = ${now}
      WHERE "id" = ${R} AND "status" IN (${statuses}) AND ${won}`),
  ]
}
