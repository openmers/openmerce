import { CatalogError } from "@openmers/core"
import { ORPCError } from "@orpc/server"

/** Maps `core` catalog errors to typed HTTP codes (400/404/409); other errors are rethrown. */
export function rethrowCatalog(error: unknown): never {
  if (error instanceof CatalogError) throw new ORPCError(error.code, { message: error.message })
  throw error
}
