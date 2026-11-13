import { sql } from "drizzle-orm"
import { affected, sqlStatement } from "../../../platform"
import { newPublicId } from "../../ids"
import { PaymentError } from "../types"
import { cumulativeDelta } from "./cumulativeDelta"
import { insertRefund, loadPayment, type RefundCtx, refundExists, refundTail } from "./ledger"

export type SyncRefundInput = {
  methodId: number
  reference: string
  /** Cumulative absolute provider refund total. */
  refundedAmount: number
  currency: string
  providerEventId: string
  providerRefundId?: string
}

/**
 * Provider refund sync (06 §5, 02-ticaret `refunds`): one `atomic()` writes a delta row and moves
 * `refunded_amount` to the reported absolute total. Every statement is bound to the pre-state
 * `refunded_amount = :previous` (read once); the payment update goes last. A duplicate event id
 * hits the `(payment_id, provider_event_id)` index and writes nothing. If a concurrent sync moved
 * the total in between, one more read decides (stale event becomes a no-op).
 */
export async function syncRefund(
  ctx: RefundCtx,
  input: SyncRefundInput,
): Promise<{ applied: boolean; refundPublicId?: string }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const pay = await loadPayment(
      ctx.platform,
      sql`p."payment_method_id" = ${input.methodId} AND p."provider_reference" = ${input.reference}`,
    )
    // event before the payment row: the provider retries (06 §5)
    if (!pay) throw new PaymentError("PAYMENT_NOT_FOUND", "no payment for this reference yet")
    if (pay.currency !== input.currency) {
      throw new PaymentError("AMOUNT_MISMATCH", "refund currency differs from the payment")
    }
    const d = cumulativeDelta(pay, input.refundedAmount)
    if (d.kind === "noop") return { applied: false }
    if (d.kind === "exceeds") throw new PaymentError("REFUND_EXCEEDS", "refunds exceed payment")

    const publicId = newPublicId("ref_")
    const pre = sql`EXISTS (SELECT 1 FROM "payments" WHERE "id" = ${pay.id}
      AND "refunded_amount" = ${pay.providerRefunded}
      AND ${d.providerRefunded} + "external_refunded_amount" <= "amount")`
    const mine = refundExists(publicId)
    const stmts = [
      insertRefund(
        ctx,
        pay,
        {
          publicId,
          amount: d.delta,
          state: "settled",
          source: "provider",
          providerEventId: input.providerEventId,
          providerRefundId: input.providerRefundId ?? null,
        },
        pre,
      ),
      ...refundTail(ctx, pay, publicId, mine, [
        sqlStatement(sql`UPDATE "payments" SET "refunded_amount" = ${d.providerRefunded},
          "updated_at" = ${ctx.now} WHERE "id" = ${pay.id}
          AND "refunded_amount" = ${pay.providerRefunded} AND ${mine}`),
      ]),
    ]
    const result = await ctx.platform.atomic(stmts)
    if (affected(result, 0)) return { applied: true, refundPublicId: publicId }
  }
  return { applied: false }
}
