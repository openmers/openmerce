import { zoneMatch } from "../../tax/strategies/taxZone"
import type { Address, Zone } from "../../tax/types"
import type { ShippingMethod } from "../types"

/**
 * Bölge uygunluğu (saf): bölgesiz yöntem her yere; bölgeli yöntem adres o bölgedeyse. Adres
 * henüz yoksa bölgeli yöntem uygun değildir. Bölge tablosu vergiyle ortak (`zones`).
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
