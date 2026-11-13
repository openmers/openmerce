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

/** Satır süzgece uyuyor mu; süzgeç boşsa her satır uyar. */
export function matchesFilter(line: PromoLine, f: ProductFilter): boolean {
  if (!f.productIds && !f.variantIds && !f.collectionIds) return true
  return (
    (f.productIds?.includes(line.productId) ?? false) ||
    (f.variantIds?.includes(line.variantId) ?? false) ||
    (line.collectionIds?.some((c) => f.collectionIds?.includes(c)) ?? false)
  )
}

/** Ürün, varyant ya da koleksiyondan en az `minQuantity` (varsayılan 1) adet. */
export const containsProducts: ConditionDef<ProductFilter & { minQuantity?: number }> = {
  code: "containsProducts",
  args: productFilterArgs.extend({ minQuantity: z.number().int().positive().optional() }),
  check: (args, view) => {
    const qty = view.lines.filter((l) => matchesFilter(l, args)).reduce((n, l) => n + l.quantity, 0)
    return qty >= (args.minQuantity ?? 1)
  },
}
