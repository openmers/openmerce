import { sql } from "drizzle-orm"
import { affected, sqlStatement } from "../../../platform"
import { newPublicId } from "../../ids"
import type { HandlerArgs, PaymentHandler } from "../port/paymentHandler"
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

export type CreateRefundInput = {
  paymentPublicId: string
  amount: number
  /** Client key; also passed to the provider. Same key = same refund. */
  idempotencyKey: string
  reason?: string
  /** Handler + args of the method the payment was made with (06 §7). */
  handler: PaymentHandler
  args: HandlerArgs
}

export type RefundOutcome = { refundPublicId: string; state: string }

/**
 * Admin refund through the provider (06 §5), three steps:
 * 1. `atomic()`: `pending` row under the cap (provider + external + open admin refunds + amount
 *    <= payment) and the unique `idempotency_key`.
 * 2. Provider call with the same key. A throw (timeout) leaves the row `unknown`: never retried
 *    blindly; reconciliation resolves it.
 * 3. `atomic()`: success moves the provider total (guarded by "row still `pending`", which the
 *    last statement flips to `settled`); refusal marks it `failed`.
 */
export async function createRefund(
  ctx: RefundCtx,
  input: CreateRefundInput,
): Promise<RefundOutcome> {
  assertAmount(input.amount)
  const refund = input.handler.refund
  if (!refund) throw new PaymentError("NOT_SUPPORTED", "handler cannot refund")
  const pay = await loadPayment(ctx.platform, sql`p."public_id" = ${input.paymentPublicId}`)
  if (!pay) throw new PaymentError("NOT_FOUND", "payment not found")
  const publicId = newPublicId("ref_")
  const cap = sql`EXISTS (SELECT 1 FROM "payments" WHERE "id" = ${pay.id}
    AND "refunded_amount" + "external_refunded_amount" + ${input.amount}
      + coalesce((SELECT sum(r."amount") FROM "refunds" r WHERE r."payment_id" = ${pay.id}
        AND r."source" = 'admin' AND r."state" IN ('pending', 'unknown')), 0) <= "amount")`
  const row = {
    publicId,
    amount: input.amount,
    state: "pending" as const,
    source: "admin" as const,
    reason: input.reason ?? null,
    idempotencyKey: input.idempotencyKey,
  }
  const started = await ctx.platform.atomic([insertRefund(ctx, pay, row, cap)])
  if (!affected(started, 0)) {
    const prior = await refundByKey(ctx.platform, input.idempotencyKey)
    if (prior) return { refundPublicId: prior.publicId, state: prior.state }
    throw new PaymentError("REFUND_EXCEEDS", "refunds exceed payment")
  }

  const setState = (state: string, extra = sql``) =>
    sqlStatement(sql`UPDATE "refunds" SET "state" = ${state}, "updated_at" = ${ctx.now} ${extra}
      WHERE "public_id" = ${publicId} AND "state" = 'pending'`)
  let result: Awaited<ReturnType<typeof refund>>
  try {
    result = await refund(
      { now: ctx.now },
      {
        publicId: pay.publicId,
        reference: pay.reference,
        amount: pay.amount,
        currency: pay.currency,
      },
      input.amount,
      input.args,
      { idempotencyKey: input.idempotencyKey },
    )
  } catch {
    await ctx.platform.atomic([setState("unknown")])
    return { refundPublicId: publicId, state: "unknown" }
  }
  if (!result.ok) {
    await ctx.platform.atomic([setState("failed")])
    return { refundPublicId: publicId, state: "failed" }
  }
  const pending = refundExists(publicId, "pending")
  await ctx.platform.atomic(
    refundTail(ctx, pay, publicId, pending, [
      sqlStatement(sql`UPDATE "payments" SET "refunded_amount" = "refunded_amount" + ${input.amount},
        "updated_at" = ${ctx.now} WHERE "id" = ${pay.id} AND ${pending}`),
      setState("settled", sql`, "provider_refund_id" = ${result.providerRefundId ?? null}`),
    ]),
  )
  return { refundPublicId: publicId, state: "settled" }
}
