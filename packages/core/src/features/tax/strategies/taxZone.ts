import type { Address, Zone } from "../types"

/**
 * Bölgenin adresi kapsama derecesi: 2 = alt bölge eşleşti, 1 = tüm ülke üyesi, 0 = kapsamıyor.
 * Kargo uygunluğu da bunu kullanır (zones vergi ve kargoda ortak).
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
  /** Teslimat adresi; yoksa kanalın varsayılanı. */
  address?: Address | null
  channelDefaultZoneId: number | null
}

/**
 * Varsayılan `taxZone` stratejisi (09-vergi §2.1, saf). Adresi kapsayan bölgelerden en özeli
 * (alt bölge > ülke), eşitlikte küçük `id`. Adres yoksa ya da hiçbir bölge kapsamıyorsa kanalın
 * varsayılan bölgesi; o da yoksa `null` (vergi satırı üretilmez).
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
