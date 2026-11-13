import type { TaxRate } from "../types"

export type TaxLineInput = {
  rates: readonly TaxRate[]
  zoneId: number | null
  taxCategoryId: number
  /** The session's customer groups (a company is also placed in a group). */
  customerGroupIds?: readonly number[]
}

export type TaxLineRate = { taxRateId: number; rateBp: number }

/**
 * Default `taxLine` strategy (09-vergi §2.2, pure): zone + category rate. If one of the customer's
 * groups has a specific rate, it replaces the general (`customer_group_id IS NULL`) rate (exemption:
 * group rate 0). If several group rates match, the lowest wins, ties by smaller `id`. Without a rate
 * an empty array (untaxed line). Returns an array: strategies like reverse charge add multiple lines.
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
