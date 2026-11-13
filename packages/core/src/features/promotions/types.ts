import type { z } from "zod"
import type { PriceListType } from "../pricing/types"

/** Sepet satırı (promosyon görünümü). Tutar küçük birim, satır toplamı (birim × adet). */
export type PromoLine = {
  key: string
  variantId: number
  productId: number
  collectionIds?: readonly number[]
  quantity: number
  amount: number
  /** Seçilen fiyatın liste türü; `contract` satıra varsayılan promosyon uygulanmaz. */
  priceType: PriceListType
  personalized?: boolean
}

export type PromoCart = {
  channelId: number
  lines: readonly PromoLine[]
  /** Kargo ücreti (kargo indirimi bunun üstünden). */
  shipping: number
  customerId: number | null
  customerGroupIds: readonly number[]
  companyId: number | null
  couponCodes: readonly string[]
  /** `requires` ile sepet verisi turunda toplanan değerler (`collectRequirements`). */
  data: Readonly<Record<string, unknown>>
}

/** Koşulun gördüğü sepet: yalnız promosyona açık satırlar (`contract` süzülmüş). */
export type CartView = { cart: PromoCart; lines: readonly PromoLine[]; subtotal: number }

/** Koşul saf ve senkrondur; veri gerekirse `requires` ile ister, içinde sorgu atılmaz. */
export type ConditionDef<A = unknown> = {
  code: string
  args: z.ZodType<A>
  requires?: readonly string[]
  check(args: A, view: CartView): boolean
}

/** Eylemin gördüğü durum: satırların ve kargonun önceki promosyonlardan **kalan** tutarı. */
export type ActionState = {
  lines: readonly { line: PromoLine; remaining: number }[]
  shipping: number
}

/** İndirim taslağı; tutarlar kalanı aşmaz (eylem kırpar, uygulayıcı yine denetler). */
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
  /** Derleme anındaki sayaç; yalnız gösterim (doğruluk rezervasyonda). */
  used: number
  stackable: boolean
  applyToContract: boolean
  channelIds: ReadonlySet<number>
  conditions: readonly ((view: CartView) => boolean)[]
  actions: readonly ((state: ActionState) => Discount[])[]
  requires: readonly string[]
}

/** Yüzde (baz puan) indirimi, yarım yukarı; `bigint` ara çarpım. */
export function percentOf(amount: number, bp: number): number {
  return Number((2n * BigInt(amount) * BigInt(bp) + 10_000n) / 20_000n)
}
