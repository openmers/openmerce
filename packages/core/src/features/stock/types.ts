import type { SQL } from "drizzle-orm"
import type { CatalogCtx } from "../catalog/products/types"

export type StockErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "CONFLICT" | "INSUFFICIENT_STOCK"

/** Expected stock errors are typed errors carrying a `code` (same pattern as the catalog). */
export class StockError extends Error {
  constructor(
    readonly code: StockErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "StockError"
  }
}

/** The `Ctx` part of stock writes (same as the catalog; audit actor via `auditActorOf`). */
export type StockCtx = CatalogCtx

/**
 * `stock_movements.ref_type` (narrow fixed list) + internal `id` (never exposed by the API). `id`
 * may also be a subquery yielding the id of a row written in the same `atomic()` (same pattern as
 * promotion usage).
 */
export type StockRef = {
  type: "reservation" | "order" | "fulfillment" | "return" | "import" | "manual"
  id: number | SQL
}

/** Reserve/release/commit line; internal ids (checkout knows them from the cart line). */
export type StockLine = { variantId: number; locationId: number; quantity: number }

export function assertCount(value: number, what: string, min = 0): void {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new StockError("INVALID_INPUT", `${what} en az ${min} tamsayı olmalı`)
  }
}
