import type { orderStates } from "@openmers/db"

export type OrderState = (typeof orderStates)[number]

export type OrderErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "INVALID_TRANSITION"

/** Expected order errors are typed errors carrying a `code` (same pattern as checkout). */
export class OrderError extends Error {
  constructor(
    readonly code: OrderErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "OrderError"
  }
}
