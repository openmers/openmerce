import type { PriceCandidate } from "../../pricing"
import type { PersonalizationValue } from "../personalization/schema"

/** Cart address (generic keys, 02-ticaret `carts.shipping_address`). */
export type CartAddress = Record<string, unknown>

export type CartRow = {
  id: number
  publicId: string
  channelId: number
  customerId: number | null
  companyId: number | null
  status: string
  currency: string
  shippingAddress: CartAddress | null
  billingAddress: CartAddress | null
  shippingMethodId: number | null
  couponCodes: string[]
  email: string | null
  version: number
}

export type CartLineData = {
  id: number
  variantId: number
  variantPublicId: string
  productId: number
  quantity: number
  lineKey: string
  personalization: PersonalizationValue | null
  customFields: Record<string, unknown> | null
  /** Raw definitions (`effectiveDefinition` input). */
  productPersonalization: unknown
  variantPersonalization: unknown
  taxCategoryId: number
  physical: boolean
  trackInventory: boolean
  weight: number | null
  length: number | null
  width: number | null
  height: number | null
}

/** Price candidate + the list's tax-inclusive flag (for the tax step). */
export type CartPrice = PriceCandidate & { variantId: number; includesTax: boolean }

/** Sellable stock in the channel's locations; lower `priority` first. */
export type CartStock = {
  variantId: number
  locationId: number
  sellable: number
  priority: number
}

/** `calculate`'s database input (at most two rounds, `loadCartData`). */
export type CartData = {
  cart: CartRow
  lines: CartLineData[]
  prices: CartPrice[]
  stock: CartStock[]
  /** Promotion `requires` values (`PromoCart.data`). */
  promoData: Record<string, unknown>
}
