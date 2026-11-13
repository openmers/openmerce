import { type StockBucket, stockBucket } from "../../stock"
import { foldText } from "../text/fold"
import { resolveVariantImages } from "./resolveVariantImages"
import type {
  IndexRow,
  MatchRow,
  ProductSource,
  SourceChannel,
  SourceTranslation,
  SourceVariant,
} from "./types"

const EXCERPT_LENGTH = 300

/** Variants sold in the channel, lowest id first (the first one is the product's `group_first` card). */
export function channelVariants(source: ProductSource, channelId: number): SourceVariant[] {
  return source.variants.filter((v) => v.channelIds.includes(channelId)).sort((a, b) => a.id - b.id)
}

/** The channel override wins over the all-channel translation; no translation = not shown in that language. */
export function translationFor(
  source: ProductSource,
  channelId: number,
  lang: string,
): SourceTranslation | undefined {
  const inLang = source.translations.filter((t) => t.lang === lang)
  return inLang.find((t) => t.channelId === channelId) ?? inLang.find((t) => t.channelId === null)
}

/** Untracked variants are always in stock; a bundle sells `floor(base / unit_factor)` (04-stok §8). */
export function variantBucket(source: ProductSource, variant: SourceVariant): StockBucket {
  if (!variant.trackInventory) return "in_stock"
  const available =
    variant.baseVariantId === null
      ? (source.available[variant.id] ?? 0)
      : Math.floor((source.available[variant.baseVariantId] ?? 0) / variant.unitFactor)
  return stockBucket(available)
}

/** Min/max over the default price list tiers of the given variants; `null` when none is priced. */
export function priceRange(
  source: ProductSource,
  channelId: number,
  variantIds: readonly number[],
): { min: number | null; max: number | null } {
  const ids = new Set(variantIds)
  const amounts = source.prices
    .filter((p) => p.channelId === channelId && ids.has(p.variantId))
    .map((p) => p.amount)
  if (amounts.length === 0) return { min: null, max: null }
  return { min: Math.min(...amounts), max: Math.max(...amounts) }
}

/** Public facet values of the product and the given variants (private facets excluded). */
export function publicFacetValueIds(
  source: ProductSource,
  variants: readonly SourceVariant[],
): number[] {
  const hidden = new Set(source.facetValues.filter((f) => f.private).map((f) => f.id))
  const ids = new Set([...source.productFacetValueIds, ...variants.flatMap((v) => v.facetValueIds)])
  return [...ids].filter((id) => !hidden.has(id)).sort((a, b) => a - b)
}

function channelCollectionIds(
  source: ProductSource,
  channelId: number,
  variants: readonly SourceVariant[],
): number[] {
  const ids = new Set(variants.flatMap((v) => v.collectionIds))
  return [...ids]
    .filter((id) => source.collectionChannels[id]?.includes(channelId))
    .sort((a, b) => a - b)
}

export function descriptionExcerpt(description: string | null): string {
  if (!description) return ""
  const plain = description
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return plain.slice(0, EXCERPT_LENGTH)
}

/**
 * `catalog_index` rows and the match rows for one channel. The `group_first` row carries the product
 * aggregate: price range over all channel variants, the union of public facets and collections, and the
 * only FTS row (all SKUs). Match rows point at the `group_first` variant, so lists, counts and search are
 * one card per product. Match rows are language independent and written once per channel.
 */
export function buildIndexRows(
  source: ProductSource,
  channel: SourceChannel,
): { rows: IndexRow[]; facets: MatchRow[]; collections: MatchRow[] } {
  const variants = channelVariants(source, channel.id)
  const first = variants[0]
  if (!first) return { rows: [], facets: [], collections: [] }
  const productFacets = publicFacetValueIds(source, variants)
  const productCollections = channelCollectionIds(source, channel.id, variants)
  const range = priceRange(
    source,
    channel.id,
    variants.map((v) => v.id),
  )
  const facetNames = (lang: string) =>
    source.facetValues
      .filter((f) => productFacets.includes(f.id))
      .map((f) => f.names[lang] ?? f.code)
      .join(" ")

  const rows: IndexRow[] = []
  for (const lang of channel.langs) {
    const t = translationFor(source, channel.id, lang)
    if (!t) continue
    for (const v of variants) {
      const groupFirst = v === first
      const own = priceRange(source, channel.id, [v.id])
      const fold = (text: string) => foldText(text, lang)
      rows.push({
        channelId: channel.id,
        lang,
        variantId: v.id,
        productId: source.id,
        productPublicId: source.publicId,
        slug: t.slug,
        name: t.name,
        sku: v.sku,
        thumb: resolveVariantImages(source.assets, v)[0] ?? null,
        collectionIds: groupFirst
          ? productCollections
          : channelCollectionIds(source, channel.id, [v]),
        facetValueIds: groupFirst ? productFacets : publicFacetValueIds(source, [v]),
        priceMin: groupFirst ? range.min : own.min,
        priceMax: groupFirst ? range.max : own.max,
        currency: channel.currency,
        stockBucket: variantBucket(source, v),
        leadTimeDays: v.leadTimeDays,
        sortName: fold(t.name),
        createdAt: source.createdAt,
        salesRank: null,
        groupFirst,
        fts: groupFirst
          ? {
              name: fold(t.name),
              sku: fold(variants.map((x) => x.sku).join(" ")),
              facetText: fold(facetNames(lang)),
              descriptionExcerpt: fold(descriptionExcerpt(t.description)),
            }
          : null,
      })
    }
  }
  const match = (id: number): MatchRow => ({ channelId: channel.id, id, variantId: first.id })
  return {
    rows,
    facets: rows.length > 0 ? productFacets.map(match) : [],
    collections: rows.length > 0 ? productCollections.map(match) : [],
  }
}
