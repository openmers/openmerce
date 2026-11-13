import { PricingError, StockError } from "@openmers/core"
import { ORPCError } from "@orpc/server"

/** `core` fiyat/stok hatalarını tipli HTTP koduna çevirir (400/404/409); başka hata yükselir. */
export function rethrowCommerce(error: unknown): never {
  if (error instanceof PricingError || error instanceof StockError) {
    throw new ORPCError(error.code, { message: error.message })
  }
  throw error
}
