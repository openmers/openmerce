import { resolvePrice } from "../../../pricing"
import { effectiveDefinition } from "../../personalization/schema"
import { surchargePerUnit } from "../../personalization/surcharge"
import type { CartData } from "../../queries/cartData"
import type { CalcConfig, CartTotals, PricedLine } from "../types"

/**
 * Step 1 (05-sepet §2): `priceSelection` (`resolvePrice`) -> `linePrice`. Unit price = selected
 * list price + personalization surcharge. A line with no price, or no surcharge amount in this
 * currency, is not priced (`unavailable`); it never counts as 0.
 */
export function priceLines(
  data: CartData,
  config: CalcConfig,
): { lines: PricedLine[]; unavailable: CartTotals["unavailable"] } {
  const lines: PricedLine[] = []
  const unavailable: CartTotals["unavailable"] = []
  for (const line of data.lines) {
    const candidates = data.prices.filter((p) => p.variantId === line.variantId)
    const resolved = resolvePrice({
      candidates,
      priceLists: config.priceLists,
      quantity: line.quantity,
      currency: data.cart.currency,
      now: config.now,
    })
    const def = effectiveDefinition(line.productPersonalization, line.variantPersonalization)
    const surcharge = resolved.ok
      ? surchargePerUnit(def, line.personalization, resolved.price.amount, data.cart.currency)
      : null
    if (!resolved.ok || surcharge === null) {
      unavailable.push({ lineId: line.id, reason: "NO_PRICE" })
      continue
    }
    const { price } = resolved
    const unitPrice = price.amount + surcharge
    const amount = unitPrice * line.quantity
    if (!Number.isSafeInteger(amount)) throw new Error("satır tutarı çok büyük")
    lines.push({
      key: String(line.id),
      lineId: line.id,
      variantId: line.variantId,
      productId: line.productId,
      quantity: line.quantity,
      priceList: price.priceList,
      priceType: price.type,
      includesTax:
        candidates.find((c) => c.priceList === price.priceList)?.includesTax ??
        config.channel.pricesIncludeTax,
      baseUnitPrice: price.amount,
      surcharge,
      unitPrice,
      amount,
      taxCategoryId: line.taxCategoryId,
      personalized: line.personalization !== null,
    })
  }
  return { lines, unavailable }
}
