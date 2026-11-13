export type PaymentErrorCode =
  | "INVALID_INPUT"
  /** Method not installed/enabled (webhook route answers 404) or unknown payment/refund. */
  | "NOT_FOUND"
  /** Signature missing or wrong; nothing was written. */
  | "INVALID_SIGNATURE"
  /** Paid amount or currency differs from the reservation snapshot (review queue). */
  | "AMOUNT_MISMATCH"
  /** Event kind the core does not know; the provider should retry. */
  | "UNKNOWN_EVENT"
  /** Refund event arrived before its payment row; the provider should retry. */
  | "PAYMENT_NOT_FOUND"
  /** Refunds would exceed the payment amount. */
  | "REFUND_EXCEEDS"
  /** The handler has no such capability (e.g. no `refund`). */
  | "NOT_SUPPORTED"

const RETRYABLE: ReadonlySet<PaymentErrorCode> = new Set(["UNKNOWN_EVENT", "PAYMENT_NOT_FOUND"])

/** Expected payment errors; `retryable` maps to a 5xx so the provider delivers again (06 §3). */
export class PaymentError extends Error {
  readonly retryable: boolean
  constructor(
    readonly code: PaymentErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "PaymentError"
    this.retryable = RETRYABLE.has(code)
  }
}
