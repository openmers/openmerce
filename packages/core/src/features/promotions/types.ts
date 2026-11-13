import type { z } from "zod"
import type { PriceListType } from "../pricing/types"

/** Cart line (promotion view). Amount in minor units, line total (unit × quantity). */
export type PromoLine = {
  key: string
  variantId: number
  productId: number
  collectionIds?: readonly number[]
  quantity: number
  amount: number
  /** List type of the selected price; default promotions are not applied to a `contract` line. */
  priceType: PriceListType
  personalized?: boolean
}

export type PromoCart = {
  channelId: number
  lines: readonly PromoLine[]
  /** Shipping fee (the shipping discount is computed off this). */
  shipping: number
  customerId: number | null
  customerGroupIds: readonly number[]
  companyId: number | null
  couponCodes: readonly string[]
  /** Values gathered in the cart data round trip via `requires` (`collectRequirements`). */
  data: Readonly<Record<string, unknown>>
}

/** The cart as seen by a condition: only promotion-eligible lines (`contract` filtered out). */
export type CartView = { cart: PromoCart; lines: readonly PromoLine[]; subtotal: number }

/** A condition is pure and synchronous; if it needs data it asks via `requires`, it never queries inside. */
export type ConditionDef<A = unknown> = {
  code: string
  args: z.ZodType<A>
  requires?: readonly string[]
  check(args: A, view: CartView): boolean
}

/** State seen by an action: the amount of lines and shipping **remaining** from earlier promotions. */
export type ActionState = {
  lines: readonly { line: PromoLine; remaining: number }[]
  shipping: number
}

/** Discount draft; amounts never exceed the remainder (the action clips, the applier checks again). */
export type Discount =
  | { target: "line"; lineKey: string; amount: number }
  | { target: "order"; amount: number; allocation: { lineKey: string; amount: number }[] }
  | { target: "shipping"; amount: number }

export type ActionDef<A = unknown> = {
  code: string
  args: z.ZodType<A>
  run(args: A, state: ActionState): Discount[]
}

export type Adjustment = Discount & { promotionId: number }

export type CompiledPromotion = {
  id: number
  publicId: string
  name: string
  priority: number
  startsAt: number | null
  endsAt: number | null
  couponCode: string | null
  usageLimit: number | null
  perCustomerLimit: number | null
  /** Counter at compile time; display only (correctness lives in the reservation). */
  used: number
  stackable: boolean
  applyToContract: boolean
  channelIds: ReadonlySet<number>
  conditions: readonly ((view: CartView) => boolean)[]
  actions: readonly ((state: ActionState) => Discount[])[]
  requires: readonly string[]
}

/** Percentage (basis point) discount, half-up; `bigint` intermediate product. */
export function percentOf(amount: number, bp: number): number {
  return Number((2n * BigInt(amount) * BigInt(bp) + 10_000n) / 20_000n)
}
