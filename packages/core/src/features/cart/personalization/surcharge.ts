import type { PersonalizationDefinition, PersonalizationValue } from "./schema"

type EnabledDefinition = Extract<PersonalizationDefinition, { enabled: true }>

/**
 * Per-unit surcharge (05-sepet §1.1 "Price"): rules bound to filled fields are summed. Fixed
 * amounts are per currency; if a rule has no amount in this currency the result is `null` (line
 * counts as unpriced, never sold undercharged). Percent is of the list price, rounded half up.
 */
export function surchargePerUnit(
  def: EnabledDefinition | null,
  value: PersonalizationValue | null,
  listUnitPrice: number,
  currency: string,
): number | null {
  if (!def || !value) return 0
  let total = 0
  for (const rule of def.surcharge) {
    if (value[rule.when] === undefined) continue
    if ("percent" in rule) {
      total += Number((2n * BigInt(listUnitPrice) * BigInt(rule.percent) + 100n) / 200n)
    } else if ("currency" in rule) {
      if (rule.currency !== currency) return null
      total += rule.amount
    } else {
      const amount = rule.amount[currency]
      if (amount === undefined) return null
      total += amount
    }
  }
  return Number.isSafeInteger(total) ? total : null
}
