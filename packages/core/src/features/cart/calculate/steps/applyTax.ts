import { type Address, splitGrossNet, taxLine, taxZone } from "../../../tax"
import type { CalcConfig, PricedLine, ShippingTotals, TotalsLine } from "../types"

type Rated = { rateBp: number; taxRateIds: number[] }

function rateFor(config: CalcConfig, zoneId: number | null, taxCategoryId: number): Rated {
  const rates = taxLine({
    rates: config.tax.rates,
    zoneId,
    taxCategoryId,
    customerGroupIds: config.customerGroupIds,
  })
  return {
    rateBp: rates.reduce((n, r) => n + r.rateBp, 0),
    taxRateIds: rates.map((r) => r.taxRateId),
  }
}

/**
 * Step 4 (05-sepet §2, 09-vergi §2): zone -> line rate -> net/tax/gross split of the discounted
 * amount, rounded once per line. The surcharge is inside the line and takes its rate. Lines take
 * the inclusive/exclusive flag from their price list, shipping from the channel.
 */
export function applyTax(
  config: CalcConfig,
  address: Address | null,
  lines: readonly PricedLine[],
  lineDiscounts: Readonly<Record<string, number>>,
  shipping: ShippingTotals,
  shippingTaxCategoryId: number | null,
): { lines: TotalsLine[]; shipping: ShippingTotals } {
  const zoneId = taxZone({
    zones: config.tax.zones,
    address,
    channelDefaultZoneId: config.channel.defaultTaxZoneId,
  })
  const out = lines.map((l) => {
    const discount = lineDiscounts[l.key] ?? 0
    const { rateBp, taxRateIds } = rateFor(config, zoneId, l.taxCategoryId)
    const split = splitGrossNet({ amount: l.amount - discount, rateBp, includesTax: l.includesTax })
    return { ...l, discount, ...split, taxRateIds }
  })
  if (shippingTaxCategoryId === null) return { lines: out, shipping }
  const { rateBp } = rateFor(config, zoneId, shippingTaxCategoryId)
  const split = splitGrossNet({
    amount: shipping.amount - shipping.discount,
    rateBp,
    includesTax: config.channel.pricesIncludeTax,
  })
  return { lines: out, shipping: { ...shipping, ...split } }
}
