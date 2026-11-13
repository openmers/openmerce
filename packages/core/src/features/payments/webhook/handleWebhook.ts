import type { Normalized, WebhookRequest } from "../port/paymentHandler"
import type { RefundCtx } from "../refunds/ledger"
import type { PaymentMethod } from "../registry/paymentMethods"
import { PaymentError } from "../types"
import { applyNormalized, type WebhookOutcome } from "./applyNormalized"

export type { WebhookOutcome }

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
  return applyNormalized(ctx, input.method, truth)
}
