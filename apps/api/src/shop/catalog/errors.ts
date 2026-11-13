import { CatalogIndexError } from "@openmers/core"
import { ORPCError } from "@orpc/server"

/** Maps read-model input errors (bad cursor, bad filter) to 400; other errors are rethrown. */
export function rethrowCatalogIndex(error: unknown): never {
  if (error instanceof CatalogIndexError) {
    throw new ORPCError("BAD_REQUEST", { message: error.message })
  }
  throw error
}
