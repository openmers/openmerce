import { sql } from "drizzle-orm"
import { affected, type Platform, sqlStatement } from "../../../platform"
import type { HandlerArgs, PaymentHandler } from "../port/paymentHandler"
import { loadPayment, type RefundCtx, refundExists, refundTail } from "./ledger"

export type UnknownRefund = {
  publicId: string
  paymentPublicId: string
  methodId: number
  amount: number
}

/** Admin refunds whose provider call timed out (`refunds_unknown_idx`), oldest first. */
export async function listUnknownRefunds(
  p: Pick<Platform, "batch">,
  limit = 50,
): Promise<UnknownRefund[]> {
  const [rows = []] = await p.batch([
    sqlStatement(sql`SELECT r."public_id", p."public_id" AS "payment_public_id",
        p."payment_method_id", r."amount"
      FROM "refunds" r JOIN "payments" p ON p."id" = r."payment_id"
      WHERE r."state" = 'unknown' ORDER BY r."id" LIMIT ${limit}`),
  ])
  return rows.map((r) => ({
    publicId: String(r.public_id),
    paymentPublicId: String(r.payment_public_id),
    methodId: Number(r.payment_method_id),
    amount: Number(r.amount),
  }))
}

export type UnknownRefundResult = "settled" | "failed" | "unresolved"

/**
 * Resolves one `unknown` admin refund (06 §5) from the provider truth (`fetchStatus` → cumulative
 * `refundSync`): total grew by at least the amount → the refund happened (same writes as the
 * success path of `createRefund`); total unchanged → it did not (`failed`); anything else stays
 * `unknown` for an admin. Never calls `refund` again.
 */
export async function resolveUnknownRefund(
  ctx: RefundCtx,
  input: { refund: UnknownRefund; handler: PaymentHandler; args: HandlerArgs },
): Promise<UnknownRefundResult> {
  const { refund, handler } = input
  const pay = await loadPayment(ctx.platform, sql`p."public_id" = ${refund.paymentPublicId}`)
  if (!pay?.reference || !handler.fetchStatus) return "unresolved"
  const truth = await handler.fetchStatus({ now: ctx.now }, pay.reference, input.args)
  if (truth.kind !== "refundSync" || truth.currency !== pay.currency) return "unresolved"
  const setState = (state: string) =>
    sqlStatement(sql`UPDATE "refunds" SET "state" = ${state}, "updated_at" = ${ctx.now}
      WHERE "public_id" = ${refund.publicId} AND "state" = 'unknown'`)
  if (truth.refundedAmount === pay.providerRefunded) {
    return affected(await ctx.platform.atomic([setState("failed")]), 0) ? "failed" : "unresolved"
  }
  if (truth.refundedAmount < pay.providerRefunded + refund.amount) return "unresolved"
  const open = refundExists(refund.publicId, "unknown")
  const result = await ctx.platform.atomic(
    refundTail(ctx, pay, refund.publicId, open, [
      sqlStatement(sql`UPDATE "payments" SET "refunded_amount" = "refunded_amount" + ${refund.amount},
        "updated_at" = ${ctx.now} WHERE "id" = ${pay.id} AND ${open}`),
      setState("settled"),
    ]),
  )
  return affected(result, result.length - 2) ? "settled" : "unresolved"
}
