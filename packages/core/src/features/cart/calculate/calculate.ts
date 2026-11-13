import type { CartData } from "../queries/cartData"
import { promoteLines } from "./steps/applyPromotions"
import { applyTax } from "./steps/applyTax"
import { priceLines } from "./steps/priceLines"
import { shipCart, toAddress } from "./steps/quoteShipping"
import { sumTotals } from "./steps/sumTotals"
import type { CalcConfig, CartTotals } from "./types"

/**
 * `calculate(cart, data) -> CartTotals` (05-sepet §2), pure: price -> promotion -> shipping ->
 * tax -> totals. Carts store no amounts; storefront, quotes and checkout call the same function.
 *
 * Shipping discounts depend on the shipping fee while free-over-amount shipping depends on the
 * discounted subtotal, so promotions run twice (both in memory): first without shipping (for the
 * discounted subtotal), then with the selected method's fee; the second pass is the result.
 */
export function calculate(data: CartData, config: CalcConfig): CartTotals {
  const { lines, unavailable } = priceLines(data, config)
  const first = promoteLines(data, lines, config, 0)
  const discounted =
    lines.reduce((n, l) => n + l.amount, 0) -
    Object.values(first.lineDiscounts).reduce((n, d) => n + d, 0)
  const quoted = shipCart(data, config, discounted)
  const promo = promoteLines(data, lines, config, quoted.amount)
  const taxCategory =
    quoted.options.find((o) => o.methodId === quoted.methodId)?.taxCategoryId ?? null
  // no selected method: fee 0 and shipping discount 0, an untaxed zero line
  const charged = quoted.amount - promo.shippingDiscount
  const shipping = { ...quoted, discount: promo.shippingDiscount, net: charged, gross: charged }
  const address = toAddress(data.cart.shippingAddress)
  const taxed = applyTax(config, address, lines, promo.lineDiscounts, shipping, taxCategory)
  return {
    currency: data.cart.currency,
    lines: taxed.lines,
    unavailable,
    promotions: promo.results,
    adjustments: promo.adjustments,
    shipping: taxed.shipping,
    ...sumTotals(taxed.lines, taxed.shipping),
  }
}
