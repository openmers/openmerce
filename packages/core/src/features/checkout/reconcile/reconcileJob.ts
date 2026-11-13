import { sql } from "drizzle-orm"
import { sqlStatement } from "../../../platform"
// direct file imports: the payments index re-exports the webhook, which imports checkout
import type { RefundCtx } from "../../payments/refunds/ledger"
import {
  listUnknownRefunds,
  resolveUnknownRefund,
} from "../../payments/refunds/resolveUnknownRefund"
import type { PaymentRegistry } from "../../payments/registry/paymentMethods"
import { applyNormalized } from "../../payments/webhook/applyNormalized"
import { OPEN_RESERVATION_STATUSES } from "../types"

export type ReconcileInput = {
  payments: Pick<PaymentRegistry, "all">
  /** Only reservations open at least this long are asked about (default 15 min). */
  olderThanMs?: number
  limit?: number
}

export type ReconcileResult = { checked: number; changed: number; refunds: number }

/**
 * Reconciliation (05-sepet §6, 06 §5): open reservations of methods with `fetchStatus` and
 * `unknown` refunds are re-read from the provider and fed into the normal settle / release /
 * refund paths, so the system converges even if a webhook never arrives. Reservations are looked
 * up by their public id (the reference handed to `createCheckout`). A provider error skips that
 * row until the next run.
 */
export async function reconcileJob(
  ctx: RefundCtx,
  input: ReconcileInput,
): Promise<ReconcileResult> {
  const methods = input.payments.all().filter((m) => m.handler.fetchStatus)
  const byId = new Map(methods.map((m) => [m.id, m]))
  const result: ReconcileResult = { checked: 0, changed: 0, refunds: 0 }
  if (methods.length === 0) return result
  const statuses = sql.join(
    OPEN_RESERVATION_STATUSES.map((s) => sql`${s}`),
    sql`, `,
  )
  const ids = sql.join(
    methods.map((m) => sql`${m.id}`),
    sql`, `,
  )
  const [rows = []] = await ctx.platform.batch([
    sqlStatement(sql`SELECT "public_id", "payment_method_id" FROM "checkout_reservations"
      WHERE "status" IN (${statuses}) AND "payment_method_id" IN (${ids})
        AND "created_at" <= ${ctx.now - (input.olderThanMs ?? 900_000)}
      ORDER BY "expires_at" LIMIT ${input.limit ?? 50}`),
  ])
  for (const r of rows) {
    const method = byId.get(Number(r.payment_method_id))
    const publicId = String(r.public_id)
    if (!method?.handler.fetchStatus) continue
    result.checked++
    try {
      const truth = await method.handler.fetchStatus({ now: ctx.now }, publicId, method.args)
      if (truth.kind === "refundSync" || truth.reservationPublicId !== publicId) continue
      const out = await applyNormalized(ctx, method, { ...truth, eventId: `reconcile:${publicId}` })
      if ((out.kind === "paid" && out.created) || ("changed" in out && out.changed)) {
        result.changed++
      }
    } catch {
      // provider does not know it yet or is down: next run
    }
  }
  for (const refund of await listUnknownRefunds(ctx.platform, input.limit ?? 50)) {
    const method = byId.get(refund.methodId)
    if (!method) continue
    try {
      const r = await resolveUnknownRefund(ctx, {
        refund,
        handler: method.handler,
        args: method.args,
      })
      if (r !== "unresolved") result.refunds++
    } catch {
      // unresolved: stays `unknown` for the next run or an admin
    }
  }
  return result
}
