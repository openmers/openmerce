import {
  buildIndexRows,
  channelVariants,
  priceRange,
  publicFacetValueIds,
  translationFor,
  variantBucket,
} from "./buildIndexRows"
import { productGallery, resolveVariantImages } from "./resolveVariantImages"
import type { BuiltIndex, ProductSource, SourceChannel, ViewRow } from "./types"

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position

/**
 * `product_view.data` for one (channel, language): everything the product page needs in one row. Prices
 * are the default price list tiers; segment prices are overlaid at request time (03-fiyat). No internal id.
 * `null` when the product is not shown there (no channel variant or no translation).
 */
export function buildProductView(
  source: ProductSource,
  channel: SourceChannel,
  lang: string,
): ViewRow | null {
  const t = translationFor(source, channel.id, lang)
  const variants = channelVariants(source, channel.id)
  if (!t || variants.length === 0) return null
  const name = (names: Readonly<Record<string, string>>, code: string) => names[lang] ?? code

  const valueCodes = new Map<number, { option: string; value: string }>()
  for (const o of source.options) {
    for (const v of o.values) valueCodes.set(v.id, { option: o.code, value: v.code })
  }
  const facetIds = new Set(publicFacetValueIds(source, variants))
  const range = priceRange(
    source,
    channel.id,
    variants.map((v) => v.id),
  )

  const data = {
    product: source.publicId,
    name: t.name,
    slug: t.slug,
    description: t.description,
    seo: { title: t.seoTitle, description: t.seoDescription },
    personalization: source.personalization,
    hreflang: channel.langs.flatMap((l) => {
      const other = translationFor(source, channel.id, l)
      return other ? [{ lang: l, slug: other.slug }] : []
    }),
    options: [...source.options].sort(byPosition).map((o) => ({
      code: o.code,
      name: name(o.names, o.code),
      values: [...o.values]
        .sort(byPosition)
        .map((v) => ({ code: v.code, name: name(v.names, v.code) })),
    })),
    facets: source.facetValues
      .filter((f) => facetIds.has(f.id))
      .map((f) => ({
        facet: f.facetCode,
        facetName: name(f.facetNames, f.facetCode),
        value: f.code,
        name: name(f.names, f.code),
      })),
    images: productGallery(source.assets),
    price: { min: range.min, max: range.max, currency: channel.currency },
    variants: variants.map((v) => ({
      id: v.publicId,
      sku: v.sku,
      options: Object.fromEntries(
        v.optionValueIds.flatMap((id) => {
          const code = valueCodes.get(id)
          return code ? [[code.option, code.value]] : []
        }),
      ),
      prices: source.prices
        .filter((p) => p.channelId === channel.id && p.variantId === v.id)
        .sort((a, b) => a.minQty - b.minQty)
        .map((p) => ({ minQty: p.minQty, amount: p.amount })),
      stock: variantBucket(source, v),
      leadTimeDays: v.leadTimeDays,
      images: resolveVariantImages(source.assets, v),
    })),
  }
  return { channelId: channel.id, lang, slug: t.slug, productId: source.id, data }
}

/** Every read-model row of the product across its channels and languages. */
export function buildIndex(source: ProductSource): BuiltIndex {
  const out: BuiltIndex = { rows: [], facets: [], collections: [], views: [] }
  for (const channel of source.channels) {
    const built = buildIndexRows(source, channel)
    out.rows.push(...built.rows)
    out.facets.push(...built.facets)
    out.collections.push(...built.collections)
    for (const lang of channel.langs) {
      const view = buildProductView(source, channel, lang)
      if (view) out.views.push(view)
    }
  }
  return out
}
