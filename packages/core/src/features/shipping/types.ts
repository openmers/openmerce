import type { z } from "zod"

/** Bellekteki kargo yöntemi (`shipping_methods` + `shipping_method_channels`). */
export type ShippingMethod = {
  id: number
  publicId: string
  name: string
  /** `null` = her yere. */
  zoneId: number | null
  checkerCode: string | null
  checkerArgs: Record<string, unknown> | null
  calculatorCode: string
  calculatorArgs: Record<string, unknown>
  taxCategoryId: number
  /** Doluysa mağazadan teslim yöntemi (teslim biçimi veridir, ad metninden çıkarılmaz). */
  pickupLocationId: number | null
  channelIds: number[]
}

/** Sepet kalemi; ağırlık gram, ölçüler milimetre, birim başına; `null` = bilinmiyor (0 değil). */
export type ShipLine = {
  variantId: number
  quantity: number
  physical: boolean
  weight: number | null
  length: number | null
  width: number | null
  height: number | null
}

/** Fiziksel kalemlerin toplamı; kalemlerden biri bilinmiyorsa toplam da `null`. */
export type Parcel = {
  weightGrams: number | null
  volumeMm3: number | null
  /** Tutar üstü ücretsiz için sepet tutarı (küçük birim). */
  subtotal: number
}

export type CalcResult =
  | { ok: true; amount: number }
  /** Hata değil: yöntem bu sepete uygun değil. */
  | { ok: false; reason: "unknown_weight" | "unknown_size" | "out_of_range" }

export type CalculatorDef<A = unknown> = {
  code: string
  args: z.ZodType<A>
  calculate(args: A, parcel: Parcel): CalcResult
}
