import { z } from "zod"
import type { ConditionDef, PromoLine } from "../../types"

const ids = z.array(z.number().int().positive()).optional()

export type ProductFilter = {
  productIds?: number[]
  variantIds?: number[]
  collectionIds?: number[]
}

export const productFilterArgs = z.object({
  productIds: ids,
  variantIds: ids,
  collectionIds: ids,
})

/** Whether the line matches the filter; with an empty filter every line matches. */
export function matchesFilter(line: PromoLine, f: ProductFilter): boolean {
  if (!f.productIds && !f.variantIds && !f.collectionIds) return true
  return (
    (f.productIds?.includes(line.productId) ?? false) ||
    (f.variantIds?.includes(line.variantId) ?? false) ||
    (line.collectionIds?.some((c) => f.collectionIds?.includes(c)) ?? false)
  )
}

/** At least `minQuantity` (default 1) units of the product, variant or collection. */
export const containsProducts: ConditionDef<ProductFilter & { minQuantity?: number }> = {
  code: "containsProducts",
  args: productFilterArgs.extend({ minQuantity: z.number().int().positive().optional() }),
  check: (args, view) => {
    const qty = view.lines.filter((l) => matchesFilter(l, args)).reduce((n, l) => n + l.quantity, 0)
    return qty >= (args.minQuantity ?? 1)
  },
}
