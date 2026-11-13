import type { Address, Zone } from "../types"

/**
 * How well a zone covers the address: 2 = subdivision matched, 1 = whole-country member, 0 = not covered.
 * Shipping eligibility uses it too (zones are shared by tax and shipping).
 */
export function zoneMatch(zone: Zone, address: Address): 0 | 1 | 2 {
  const country = address.country.toUpperCase()
  const region = address.region?.toUpperCase() ?? null
  let best: 0 | 1 | 2 = 0
  for (const m of zone.members) {
    if (m.country.toUpperCase() !== country) continue
    if (m.region === null) best = best === 2 ? 2 : 1
    else if (region !== null && m.region.toUpperCase() === region) best = 2
  }
  return best
}

export type TaxZoneInput = {
  zones: readonly Zone[]
  /** Shipping address; otherwise the channel's default. */
  address?: Address | null
  channelDefaultZoneId: number | null
}

/**
 * Default `taxZone` strategy (09-vergi §2.1, pure). The most specific zone covering the address
 * (subdivision > country), ties by smaller `id`. If there is no address or no zone covers it, the channel's
 * default zone; if that is missing too, `null` (no tax line is produced).
 */
export function taxZone(input: TaxZoneInput): number | null {
  if (input.address) {
    let found: { id: number; score: number } | undefined
    for (const zone of input.zones) {
      const score = zoneMatch(zone, input.address)
      if (score === 0) continue
      if (!found || score > found.score || (score === found.score && zone.id < found.id)) {
        found = { id: zone.id, score }
      }
    }
    if (found) return found.id
  }
  return input.channelDefaultZoneId
}
