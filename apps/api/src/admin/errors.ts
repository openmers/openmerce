import { PricingError, StockError } from "@openmers/core"
import { ORPCError } from "@orpc/server"

/** Maps `core` price/stock errors to typed HTTP codes (400/404/409); other errors are rethrown. */
export function rethrowCommerce(error: unknown): never {
  if (error instanceof PricingError || error instanceof StockError) {
    throw new ORPCError(error.code, { message: error.message })
  }
  throw error
}
