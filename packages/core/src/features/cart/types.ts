import type { Ctx } from "../../ctx"

export type CartErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  /** Cart `version` changed or the cart is not `active`: re-read and retry. */
  | "CART_CHANGED"
  | "PERSONALIZATION_NOT_ALLOWED"
  /** Field-coded personalization error; `field` says which field and why. */
  | "PERSONALIZATION_INVALID"

/** Expected cart errors are typed errors carrying a `code` (same pattern as catalog). */
export class CartError extends Error {
  constructor(
    readonly code: CartErrorCode,
    message: string,
    /** Personalization: field key + sub-code (`REQUIRED`, `MAX_LENGTH`, ...). */
    readonly field?: { key: string; reason: string },
  ) {
    super(message)
    this.name = "CartError"
  }
}

/** The `Ctx` slice cart writes need. */
export type CartCtx = Pick<Ctx, "platform" | "now">
