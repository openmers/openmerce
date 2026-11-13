import { quoteShipping } from "../../../shipping"
import type { Address } from "../../../tax"
import type { CartAddress, CartData } from "../../queries/cartData"
import type { CalcConfig, ShippingTotals } from "../types"

/** Zone input from the cart address (`country_code`, `region`); `null` without a country. */
export function toAddress(address: CartAddress | null): Address | null {
  const country = address?.country_code
  if (typeof country !== "string" || country === "") return null
  const region = address?.region
  return { country, region: typeof region === "string" && region !== "" ? region : null }
}

/**
 * Step 3 (05-sepet §2): eligible methods + fee (`quoteShipping`, pure). `subtotal` is the
 * discounted line total, for free-over-amount. If the cart's selected method is not among the
 * options the method is `null` and the fee 0 (tax/discount fields are filled by later steps).
 */
export function shipCart(data: CartData, config: CalcConfig, subtotal: number): ShippingTotals {
  const sellable = new Map(data.stock.map((s) => [`${s.locationId}:${s.variantId}`, s.sellable]))
  const quote = quoteShipping({
    methods: config.shippingMethods,
    channelId: data.cart.channelId,
    lines: data.lines.map((l) => ({
      variantId: l.variantId,
      quantity: l.quantity,
      physical: l.physical,
      weight: l.weight,
      length: l.length,
      width: l.width,
      height: l.height,
    })),
    address: toAddress(data.cart.shippingAddress),
    zones: config.tax.zones,
    subtotal,
    stockAt: (location, variant) => sellable.get(`${location}:${variant}`) ?? 0,
  })
  const chosen = quote.options.find((o) => o.methodId === data.cart.shippingMethodId)
  const amount = chosen?.amount ?? 0
  return {
    needsShipping: quote.needsShipping,
    options: quote.options,
    methodId: chosen?.methodId ?? null,
    amount,
    discount: 0,
    net: amount,
    tax: 0,
    gross: amount,
  }
}
