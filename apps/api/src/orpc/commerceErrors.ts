import { CartError, CheckoutError, OrderError, PaymentError } from "@openmers/core"
import { ORPCError } from "@orpc/server"

/** Core code → contract code; codes not listed pass through unchanged. */
const MAP: Record<string, string> = {
  PERSONALIZATION_NOT_ALLOWED: "INVALID_INPUT",
  PERSONALIZATION_INVALID: "INVALID_INPUT",
  PAYMENT_MISMATCH: "CONFLICT",
  AMOUNT_MISMATCH: "CONFLICT",
  NOT_SUPPORTED: "CONFLICT",
  INVALID_SIGNATURE: "INVALID_INPUT",
  UNKNOWN_EVENT: "INTERNAL",
  PAYMENT_NOT_FOUND: "INTERNAL",
}

/** Maps cart/checkout/payment/order errors to typed HTTP codes; other errors are rethrown. */
export function rethrowCommerce(error: unknown): never {
  if (
    error instanceof CartError ||
    error instanceof CheckoutError ||
    error instanceof PaymentError ||
    error instanceof OrderError
  ) {
    throw new ORPCError(MAP[error.code] ?? error.code, { message: error.message })
  }
  throw error
}
