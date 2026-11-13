import { CheckoutError, markPaymentPending, releaseReservation, settle } from "../../checkout"
import type { Normalized, WebhookRequest } from "../port/paymentHandler"
import type { RefundCtx } from "../refunds/ledger"
import { syncRefund } from "../refunds/syncRefund"
import type { PaymentMethod } from "../registry/paymentMethods"
import { PaymentError } from "../types"

export type WebhookOutcome =
  | { kind: "paid"; orderPublicId: string; created: boolean; stockException: boolean }
  | { kind: "release"; changed: boolean }
  | { kind: "pending"; changed: boolean }
  | { kind: "refundSync"; applied: boolean }

/**
 * Provider-neutral webhook flow (06 §3, 22.4): verify (the handler compares the signature in
 * constant time) → re-read the truth with `fetchStatus` when available → settle / release /
 * pending / refund sync. Nothing is written before verification. Idempotency lives in the writes
 * (catalog decision, no event table): settlement token + `(method, provider_reference)` for
 * payments, `(payment_id, provider_event_id)` + the cumulative condition for refunds. Errors with
 * `retryable` should answer 5xx so the provider retries; the rest answer 4xx/200.
 */
export async function handleWebhook(
  ctx: RefundCtx,
  input: { method: PaymentMethod; request: WebhookRequest },
): Promise<WebhookOutcome> {
  const { handler, args } = input.method
  const hctx = { now: ctx.now }
  const nudge = await handler.verifyWebhook(hctx, input.request, args)
  if (!nudge) throw new PaymentError("INVALID_SIGNATURE", "webhook signature rejected")
  const ref = "reference" in nudge ? nudge.reference : undefined
  const truth: Normalized =
    handler.fetchStatus && ref
      ? { ...(await handler.fetchStatus(hctx, ref, args)), eventId: nudge.eventId }
      : nudge

  switch (truth.kind) {
    case "paid":
      try {
        const r = await settle(ctx, {
          reservationPublicId: truth.reservationPublicId,
          payment: {
            amount: truth.amount,
            currency: truth.currency,
            reference: truth.reference,
            state: truth.captured ? "settled" : "authorized",
            methodId: input.method.id,
          },
        })
        return {
          kind: "paid",
          orderPublicId: r.orderPublicId,
          created: r.created,
          stockException: r.stockException,
        }
      } catch (e) {
        if (e instanceof CheckoutError && e.code === "PAYMENT_MISMATCH") {
          throw new PaymentError("AMOUNT_MISMATCH", "paid amount or currency differs")
        }
        throw e
      }
    case "release":
      return {
        kind: "release",
        changed: await releaseReservation(ctx, {
          reservationPublicId: truth.reservationPublicId,
          status: "failed",
        }),
      }
    case "pending":
      return {
        kind: "pending",
        changed: await markPaymentPending(ctx, { reservationPublicId: truth.reservationPublicId }),
      }
    case "refundSync": {
      const r = await syncRefund(ctx, {
        methodId: input.method.id,
        reference: truth.reference,
        refundedAmount: truth.refundedAmount,
        currency: truth.currency,
        providerEventId: truth.eventId,
        providerRefundId: truth.providerRefundId,
      })
      return { kind: "refundSync", applied: r.applied }
    }
    default:
      throw new PaymentError("UNKNOWN_EVENT", "unknown webhook event kind")
  }
}
