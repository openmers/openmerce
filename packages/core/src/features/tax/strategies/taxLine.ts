import type { TaxRate } from "../types"

export type TaxLineInput = {
  rates: readonly TaxRate[]
  zoneId: number | null
  taxCategoryId: number
  /** Oturumun müşteri grupları (şirket de bir gruba konur). */
  customerGroupIds?: readonly number[]
}

export type TaxLineRate = { taxRateId: number; rateBp: number }

/**
 * Varsayılan `taxLine` stratejisi (09-vergi §2.2, saf): bölge + kategori oranı. Müşterinin bir
 * grubuna özel oran varsa genel (`customer_group_id IS NULL`) oranın yerine geçer (muafiyet:
 * grup oranı 0). Birden çok grup oranı uyarsa en düşük oran, eşitlikte küçük `id`. Oran yoksa
 * boş dizi (vergisiz satır). Dizi döner: ters yükleme gibi stratejiler birden çok satır ekler.
 */
export function taxLine(input: TaxLineInput): TaxLineRate[] {
  if (input.zoneId === null) return []
  const groups = new Set(input.customerGroupIds ?? [])
  let general: TaxRate | undefined
  let group: TaxRate | undefined
  for (const r of input.rates) {
    if (r.zoneId !== input.zoneId || r.taxCategoryId !== input.taxCategoryId) continue
    if (r.customerGroupId === null) general ??= r
    else if (groups.has(r.customerGroupId)) {
      if (!group || r.rateBp < group.rateBp || (r.rateBp === group.rateBp && r.id < group.id)) {
        group = r
      }
    }
  }
  const chosen = group ?? general
  return chosen ? [{ taxRateId: chosen.id, rateBp: chosen.rateBp }] : []
}
