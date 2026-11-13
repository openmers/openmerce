import { CatalogError } from "@openmers/core"
import { ORPCError } from "@orpc/server"

/** `core` katalog hatalarını tipli HTTP koduna çevirir (400/404/409); başka hata yükselir. */
export function rethrowCatalog(error: unknown): never {
  if (error instanceof CatalogError) throw new ORPCError(error.code, { message: error.message })
  throw error
}
