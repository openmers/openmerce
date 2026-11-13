import type { ShipLine, ShippingMethod } from "../types"

/** Depo × varyant satılabilir adedi (çağıran stok okumasından verir). */
export type StockAt = (locationId: number, variantId: number) => number

/**
 * Mağazadan teslim uygunluğu (10-kargo §4, saf): yöntemin deposunda her fiziksel kalemin adedi
 * kadar satılabilir stok var. Depo `pickup_enabled` denetimi çağıranın yöntem listesindedir.
 */
export function pickupEligible(
  method: Pick<ShippingMethod, "pickupLocationId">,
  lines: readonly ShipLine[],
  stockAt: StockAt,
): boolean {
  const location = method.pickupLocationId
  if (location === null) return true
  const need = new Map<number, number>()
  for (const l of lines) {
    if (l.physical) need.set(l.variantId, (need.get(l.variantId) ?? 0) + l.quantity)
  }
  return [...need].every(([variantId, qty]) => stockAt(location, variantId) >= qty)
}
