export type CheckoutErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  /** Cart `version` changed or cart not `active`: recalculate. */
  | "CART_CHANGED"
  /** At least one line was short; nothing was written. */
  | "INSUFFICIENT_STOCK"
  /** A limited promotion/coupon ran out (global or per-customer limit). */
  | "COUPON_EXHAUSTED"
  /** Settlement payment amount or currency differs from the reservation snapshot. */
  | "PAYMENT_MISMATCH"
  /** Reservation state moved under a settlement twice in a row; retry later. */
  | "CONFLICT"

/** Expected checkout errors are typed errors carrying a `code` (same pattern as catalog). */
export class CheckoutError extends Error {
  constructor(
    readonly code: CheckoutErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "CheckoutError"
  }
}

export const OPEN_RESERVATION_STATUSES = ["active", "payment_pending"] as const
