import { PaymentError } from "../types"

export type RefundTotals = {
  amount: number
  /** `payments.refunded_amount`: provider total, absolute. */
  providerRefunded: number
  /** `payments.external_refunded_amount`: manual records, additive. */
  externalRefunded: number
}

export type CumulativeResult =
  /** Stale or duplicate event: the stored total already covers it. */
  | { kind: "noop" }
  | { kind: "apply"; delta: number; providerRefunded: number }
  /** Provider total + external would exceed the payment (review queue). */
  | { kind: "exceeds" }

/**
 * Provider refund events carry the cumulative absolute amount (06 §3); the ledger row carries
 * the delta (pure). Out-of-order or repeated events become `noop`. The database condition stays the
 * real cap; this only tells the cases apart.
 */
export function cumulativeDelta(t: RefundTotals, reported: number): CumulativeResult {
  for (const v of [t.amount, t.providerRefunded, t.externalRefunded, reported]) {
    if (!Number.isSafeInteger(v) || v < 0) {
      throw new PaymentError("INVALID_INPUT", "amounts must be non-negative integers")
    }
  }
  if (reported <= t.providerRefunded) return { kind: "noop" }
  if (reported + t.externalRefunded > t.amount) return { kind: "exceeds" }
  return { kind: "apply", delta: reported - t.providerRefunded, providerRefunded: reported }
}
