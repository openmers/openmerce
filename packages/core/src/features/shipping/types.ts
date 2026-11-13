import type { z } from "zod"

/** In-memory shipping method (`shipping_methods` + `shipping_method_channels`). */
export type ShippingMethod = {
  id: number
  publicId: string
  name: string
  /** `null` = everywhere. */
  zoneId: number | null
  checkerCode: string | null
  checkerArgs: Record<string, unknown> | null
  calculatorCode: string
  calculatorArgs: Record<string, unknown>
  taxCategoryId: number
  /** If set, a store pickup method (the delivery type is data, not inferred from the name text). */
  pickupLocationId: number | null
  channelIds: number[]
}

/** Cart item; weight in grams, dimensions in millimetres, per unit; `null` = unknown (not 0). */
export type ShipLine = {
  variantId: number
  quantity: number
  physical: boolean
  weight: number | null
  length: number | null
  width: number | null
  height: number | null
}

/** Total of physical items; if any item is unknown the total is `null` too. */
export type Parcel = {
  weightGrams: number | null
  volumeMm3: number | null
  /** Cart amount for free-over shipping (minor units). */
  subtotal: number
}

export type CalcResult =
  | { ok: true; amount: number }
  /** Not an error: the method is not eligible for this cart. */
  | { ok: false; reason: "unknown_weight" | "unknown_size" | "out_of_range" }

export type CalculatorDef<A = unknown> = {
  code: string
  args: z.ZodType<A>
  calculate(args: A, parcel: Parcel): CalcResult
}
