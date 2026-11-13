import type { PriceListType } from "../../pricing"
import type { Adjustment, CompiledPromotion, PromotionResult } from "../../promotions"
import type { ShippingMethod, ShippingOption } from "../../shipping"
import type { TaxConfig } from "../../tax"

/** In-memory configuration (registries); `calculate` runs no queries. */
export type CalcConfig = {
  channel: { id: number; defaultTaxZoneId: number | null; pricesIncludeTax: boolean }
  promotions: readonly CompiledPromotion[]
  shippingMethods: readonly ShippingMethod[]
  tax: TaxConfig
  customerGroupIds?: readonly number[]
  /** Session price lists (`public_id`); all of the channel's when omitted. */
  priceLists?: readonly string[]
  now: number
}

/** Priced line (step 1). Minor units; `amount = unitPrice × quantity`. */
export type PricedLine = {
  key: string
  lineId: number
  variantId: number
  productId: number
  quantity: number
  priceList: string
  priceType: PriceListType
  includesTax: boolean
  /** Selected list price (per unit). */
  baseUnitPrice: number
  /** Personalization surcharge (per unit); takes the line's tax category. */
  surcharge: number
  unitPrice: number
  amount: number
  taxCategoryId: number
  personalized: boolean
}

export type TotalsLine = PricedLine & {
  discount: number
  net: number
  tax: number
  gross: number
  taxRateIds: number[]
}

export type ShippingTotals = {
  needsShipping: boolean
  options: ShippingOption[]
  /** Method selected on the cart and still eligible; else `null` (fee 0, checkout rejects). */
  methodId: number | null
  amount: number
  discount: number
  net: number
  tax: number
  gross: number
}

export type CartTotals = {
  currency: string
  lines: TotalsLine[]
  /** Lines without a price (excluded from totals; checkout rejects). */
  unavailable: { lineId: number; reason: "NO_PRICE" }[]
  promotions: PromotionResult[]
  adjustments: Adjustment[]
  shipping: ShippingTotals
  /** Sum of line amounts before discounts. */
  subtotal: number
  /** Line + shipping discount. */
  discount: number
  net: number
  tax: number
  gross: number
}
