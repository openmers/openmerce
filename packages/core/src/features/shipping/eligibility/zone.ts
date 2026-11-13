import { zoneMatch } from "../../tax/strategies/taxZone"
import type { Address, Zone } from "../../tax/types"
import type { ShippingMethod } from "../types"

/**
 * Zone eligibility (pure): a method without zones ships everywhere; a zoned method only if the address is in that zone.
 * If there is no address yet, a zoned method is not eligible. The zone table is shared with tax (`zones`).
 */
export function zoneEligible(
  method: Pick<ShippingMethod, "zoneId">,
  address: Address | null,
  zones: readonly Zone[],
): boolean {
  if (method.zoneId === null) return true
  if (!address) return false
  const zone = zones.find((z) => z.id === method.zoneId)
  return zone !== undefined && zoneMatch(zone, address) > 0
}
