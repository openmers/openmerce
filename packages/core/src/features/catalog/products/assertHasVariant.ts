import { CatalogError } from "./types"

/**
 * Katalog kuralı (02-katalog-ve-arama §1): her ürünün **en az bir** varyantı vardır ve SKU
 * katalogda benzersizdir (kısmi benzersiz indeks `product_variants_sku_uq`, silinmişler hariç).
 * Paket içi yinelenen SKU veritabanına gitmeden, aynı iletide reddedilir.
 */
export function assertHasVariant(
  variants: ReadonlyArray<{ sku: string }>,
  opts: { previous?: readonly string[] } = {},
): void {
  if (variants.length === 0) {
    throw new CatalogError("INVALID_INPUT", "ürünün en az bir varyantı olmalı")
  }
  const seen = new Set<string>()
  for (const variant of variants) {
    const sku = variant.sku.trim()
    if (sku.length === 0) throw new CatalogError("INVALID_INPUT", "SKU boş olamaz")
    if (seen.has(sku)) throw new CatalogError("CONFLICT", `SKU yineleniyor: ${sku}`)
    seen.add(sku)
  }
  for (const sku of opts.previous ?? []) {
    if (seen.has(sku.trim())) throw new CatalogError("CONFLICT", `SKU zaten kullanılıyor: ${sku}`)
  }
}
