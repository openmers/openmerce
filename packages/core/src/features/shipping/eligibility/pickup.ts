import type { ShipLine, ShippingMethod } from "../types"

/** Sellable quantity per warehouse × variant (the caller provides it from a stock read). */
export type StockAt = (locationId: number, variantId: number) => number

/**
 * Store pickup eligibility (10-kargo §4, pure): the method's warehouse has sellable stock for each physical
 * item's quantity. The warehouse `pickup_enabled` check lives in the caller's method list.
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
