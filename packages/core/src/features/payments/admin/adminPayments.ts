import { type SQL, sql } from "drizzle-orm"
import type { CtxActor } from "../../../ctx"
import { affected, sqlStatement } from "../../../platform"
import { auditStatement } from "../../audit"
import { auditActorOf } from "../../customers/account/auditActor"
// direct file import: orders' index exports the cancel flow, which imports refunds
import { refreshDerivedState } from "../../orders/derived/refreshDerivedState"
import { createRefund, type RefundOutcome } from "../refunds/createRefund"
import { assertAmount, type LoadedPayment, loadPayment, type RefundCtx } from "../refunds/ledger"
import { markManualRefund } from "../refunds/markManualRefund"
import type { PaymentMethod } from "../registry/paymentMethods"
import { PaymentError } from "../types"

export type AdminPaymentCtx = RefundCtx & { actor: CtxActor; requestId: string; channelId: number }

type MethodOf = (methodId: number) => Pick<PaymentMethod, "handler" | "args"> | undefined

async function channelPayment(ctx: AdminPaymentCtx, publicId: string): Promise<LoadedPayment> {
  const pay = await loadPayment(
    ctx.platform,
    // `where` must only use alias `p` (the tax-line query has no `o`)
    sql`p."public_id" = ${publicId} AND EXISTS (SELECT 1 FROM "orders" c
      WHERE c."id" = p."order_id" AND c."channel_id" = ${ctx.channelId})`,
  )
  if (!pay) throw new PaymentError("NOT_FOUND", "payment not found")
  return pay
}

function audit(
  ctx: AdminPaymentCtx,
  pay: LoadedPayment,
  action: string,
  after: object,
  when?: SQL,
) {
  return auditStatement(
    ctx.platform.db,
    {
      actor: auditActorOf(ctx.actor),
      action,
      entityType: "payment",
      entityPublicId: pay.publicId,
      channelId: ctx.channelId,
      after: { order: pay.orderPublicId, ...after },
      requestId: ctx.requestId,
    },
    ctx.now,
    when,
  )
}

/**
 * Admin refund (06 §5): through the provider when the handler can refund (`createRefund`: the
 * cap is a database condition), otherwise recorded as a manual refund. Audited after the write.
 */
export async function refundPayment(
  ctx: AdminPaymentCtx,
  input: {
    paymentPublicId: string
    amount: number
    idempotencyKey: string
    reason?: string
    methodOf: MethodOf
  },
): Promise<RefundOutcome> {
  assertAmount(input.amount)
  const pay = await channelPayment(ctx, input.paymentPublicId)
  const method = input.methodOf(pay.methodId)
  const base = { paymentPublicId: pay.publicId, amount: input.amount, reason: input.reason }
  const outcome: RefundOutcome = method?.handler.refund
    ? await createRefund(ctx, {
        ...base,
        idempotencyKey: input.idempotencyKey,
        handler: method.handler,
        args: method.args,
      })
    : {
        ...(await markManualRefund(ctx, { ...base, idempotencyKey: input.idempotencyKey })),
        state: "settled",
      }
  await ctx.platform.atomic([
    audit(ctx, pay, "payments:refund", { refund: outcome.refundPublicId, amount: input.amount }),
  ])
  return outcome
}

/**
 * Captures an authorized payment through the handler, then `authorized → settled` (amount set to
 * the captured amount) + cached order payment status + audit in one `atomic()`.
 */
export async function capturePayment(
  ctx: AdminPaymentCtx,
  input: { paymentPublicId: string; amount?: number; methodOf: MethodOf },
): Promise<{ state: "settled" }> {
  const pay = await channelPayment(ctx, input.paymentPublicId)
  const amount = input.amount ?? pay.amount
  assertAmount(amount)
  if (amount > pay.amount) throw new PaymentError("INVALID_INPUT", "capture exceeds authorization")
  if (pay.state !== "authorized") throw new PaymentError("INVALID_INPUT", "payment not authorized")
  const method = input.methodOf(pay.methodId)
  if (!method?.handler.capture) throw new PaymentError("NOT_SUPPORTED", "handler cannot capture")
  const ref = { publicId: pay.publicId, reference: pay.reference, amount, currency: pay.currency }
  const result = await method.handler.capture({ now: ctx.now }, ref, amount, method.args)
  if (!result.ok) throw new PaymentError("NOT_SUPPORTED", "provider declined the capture")
  const won = sql`EXISTS (SELECT 1 FROM "payments" WHERE "id" = ${pay.id} AND "state" = 'authorized')`
  // audit only when this call moved the state; the flipping update goes after it
  const stmts = [
    audit(ctx, pay, "payments:capture", { amount }, won),
    sqlStatement(sql`UPDATE "payments" SET "state" = 'settled', "amount" = ${amount},
      "updated_at" = ${ctx.now} WHERE "id" = ${pay.id} AND "state" = 'authorized'`),
    refreshDerivedState(pay.orderId, ctx.now),
  ]
  if (!affected(await ctx.platform.atomic(stmts), 1)) {
    throw new PaymentError("INVALID_INPUT", "payment not authorized")
  }
  return { state: "settled" }
}
