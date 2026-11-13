import type { CatalogCtx } from "../catalog/products/types"

/** Expected pricing errors are typed errors carrying a `code` (same pattern as the catalog). */
export type PricingErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "CONFLICT"

export class PricingError extends Error {
  constructor(
    readonly code: PricingErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "PricingError"
  }
}

/** The `Ctx` part of pricing writes (same as the catalog; audit actor via `auditActorOf`). */
export type PricingCtx = CatalogCtx

export type PriceListType = "base" | "sale" | "contract"

export const PRICE_LIST_TYPES: readonly PriceListType[] = ["base", "sale", "contract"]

const CURRENCY = /^[A-Z]{3}$/

export function assertCurrency(currency: string): void {
  if (!CURRENCY.test(currency)) {
    throw new PricingError("INVALID_INPUT", `geçersiz para birimi: ${currency}`)
  }
}

/** Money is an integer in minor units; floating point and values outside the safe range are rejected. */
export function isMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
}

/** `starts_at < ends_at` (when both are set). */
export function assertWindow(startsAt?: number | null, endsAt?: number | null): void {
  if (startsAt != null && endsAt != null && startsAt >= endsAt) {
    throw new PricingError("INVALID_INPUT", "başlangıç bitişten önce olmalı")
  }
}

/** Maps SQLite errors to expected pricing errors; any other error is rethrown as is. */
export function mapPricingWriteError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error)
  if (/UNIQUE/i.test(message) && /price_lists\.(channel_id|currency)/i.test(message)) {
    throw new PricingError("CONFLICT", "bu kanal ve para biriminde base liste zaten var")
  }
  if (/FOREIGN KEY/i.test(message)) {
    throw new PricingError("CONFLICT", "liste başka bir kayıt tarafından kullanılıyor")
  }
  throw error
}
