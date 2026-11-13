// direct file imports: checkout's index re-exports the reconcile job, which imports this file
import { markPaymentPending } from "../../checkout/pending/markPaymentPending"
import { releaseReservation } from "../../checkout/release/releaseReservation"
import { settle } from "../../checkout/settle/settle"
import { CheckoutError } from "../../checkout/types"
import type { Normalized } from "../port/paymentHandler"
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
 * Acts on one verified `Normalized` outcome: settle / release / pending / refund sync. Shared by
 * the webhook, the return page and reconciliation, so all three take the same write path.
 */
export async function applyNormalized(
  ctx: RefundCtx,
  method: Pick<PaymentMethod, "id">,
  truth: Normalized,
): Promise<WebhookOutcome> {
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
            methodId: method.id,
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
        methodId: method.id,
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
