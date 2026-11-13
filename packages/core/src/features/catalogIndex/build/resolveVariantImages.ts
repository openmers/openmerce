import type { ImageRef, SourceAsset, SourceVariant } from "./types"

const byPosition = (a: SourceAsset, b: SourceAsset) => a.position - b.position

/** The product gallery: assets bound to neither a variant nor an option value. */
export function productGallery(assets: readonly SourceAsset[]): ImageRef[] {
  return assets
    .filter((a) => a.variantId === null && a.optionValueId === null)
    .sort(byPosition)
    .map((a) => a.image)
}

/**
 * 02-katalog §7, resolved at index time: the variant's own images → its option values' images →
 * the product gallery. The first non-empty level wins.
 */
export function resolveVariantImages(
  assets: readonly SourceAsset[],
  variant: Pick<SourceVariant, "id" | "optionValueIds">,
): ImageRef[] {
  const own = assets.filter((a) => a.variantId === variant.id)
  if (own.length > 0) return own.sort(byPosition).map((a) => a.image)
  const values = new Set(variant.optionValueIds)
  const byValue = assets.filter((a) => a.optionValueId !== null && values.has(a.optionValueId))
  if (byValue.length > 0) return byValue.sort(byPosition).map((a) => a.image)
  return productGallery(assets)
}
