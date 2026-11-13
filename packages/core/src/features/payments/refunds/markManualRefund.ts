import { sql } from "drizzle-orm"
import { affected, sqlStatement } from "../../../platform"
import { newPublicId } from "../../ids"
import { PaymentError } from "../types"
import {
  assertAmount,
  insertRefund,
  loadPayment,
  type RefundCtx,
  refundByKey,
  refundExists,
  refundTail,
} from "./ledger"

export type ManualRefundInput = {
  paymentPublicId: string
  amount: number
  reason?: string
  idempotencyKey?: string
}

/**
 * Manual refund record (06 §5, e.g. paid back by bank transfer): the provider is not called. The
 * external total is additive; the cap `refunded + external + amount <= payment` is the insert's
 * database condition, so two racing admins cannot both pass it.
 */
export async function markManualRefund(
  ctx: RefundCtx,
  input: ManualRefundInput,
): Promise<{ refundPublicId: string }> {
  assertAmount(input.amount)
  const pay = await loadPayment(ctx.platform, sql`p."public_id" = ${input.paymentPublicId}`)
  if (!pay) throw new PaymentError("NOT_FOUND", "payment not found")
  const publicId = newPublicId("ref_")
  const cap = sql`EXISTS (SELECT 1 FROM "payments" WHERE "id" = ${pay.id}
    AND "refunded_amount" + "external_refunded_amount" + ${input.amount} <= "amount")`
  const mine = refundExists(publicId)
  const stmts = [
    insertRefund(
      ctx,
      pay,
      {
        publicId,
        amount: input.amount,
        state: "settled",
        source: "manual",
        reason: input.reason ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
      },
      cap,
    ),
    ...refundTail(ctx, pay, publicId, mine, [
      sqlStatement(sql`UPDATE "payments"
        SET "external_refunded_amount" = "external_refunded_amount" + ${input.amount},
          "updated_at" = ${ctx.now} WHERE "id" = ${pay.id} AND ${mine}`),
    ]),
  ]
  const result = await ctx.platform.atomic(stmts)
  if (affected(result, 0)) return { refundPublicId: publicId }
  const prior = input.idempotencyKey ? await refundByKey(ctx.platform, input.idempotencyKey) : null
  if (prior) return { refundPublicId: prior.publicId }
  throw new PaymentError("REFUND_EXCEEDS", "refunds exceed payment")
}
