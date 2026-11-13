import type { CatalogCtx } from "../catalog/products/types"

export type StockErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "CONFLICT" | "INSUFFICIENT_STOCK"

/** Beklenen stok hataları `code` taşıyan tipli hatadır (katalogla aynı desen). */
export class StockError extends Error {
  constructor(
    readonly code: StockErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "StockError"
  }
}

/** Stok yazımlarının `Ctx` parçası (katalogla aynı; denetim aktörü `auditActorOf`). */
export type StockCtx = CatalogCtx

/** `stock_movements.ref_type` (dar sabit liste) + iç `id` (API'ye çıkmaz). */
export type StockRef = {
  type: "reservation" | "order" | "fulfillment" | "return" | "import" | "manual"
  id: number
}

/** Rezervasyon/bırakma/düşüm kalemi; iç kimlikler (checkout sepet satırından bilir). */
export type StockLine = { variantId: number; locationId: number; quantity: number }

export function assertCount(value: number, what: string, min = 0): void {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new StockError("INVALID_INPUT", `${what} en az ${min} tamsayı olmalı`)
  }
}
