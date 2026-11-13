import type { Ctx } from "../../ctx"

/** Expected customer errors carry a `code` (mapped to HTTP status in the API layer). */
export type CustomerErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "CONFLICT" | "LIMIT_EXCEEDED"

export class CustomerError extends Error {
  constructor(
    readonly code: CustomerErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "CustomerError"
  }
}

/** The part of `Ctx` customer writes need. */
export type CustomersCtx = Pick<Ctx, "platform" | "now" | "requestId">

/** Manual group writes come from the admin side; the actor goes to the audit row. */
export type CustomerAdminCtx = CustomersCtx & Pick<Ctx, "actor">
