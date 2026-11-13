import { type CustomerActor, CustomerError } from "@openmers/core"
import { ORPCError } from "@orpc/server"
import type { ApiContext } from "../../orpc/base"

/** Account endpoints need an `om_s` session; the customer id never comes from input (ownership). */
export function requireCustomer(context: Pick<ApiContext, "customer">): CustomerActor {
  if (!context.customer) throw new ORPCError("UNAUTHENTICATED")
  return context.customer
}

/** Maps core customer errors to typed HTTP codes; other errors are rethrown. */
export function rethrowCustomer(error: unknown): never {
  if (error instanceof CustomerError) throw new ORPCError(error.code, { message: error.message })
  throw error
}
