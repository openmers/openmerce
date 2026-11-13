import {
  channels,
  priceLists,
  prices,
  productChannels,
  productFacetValues,
  products,
  productTranslations,
  productVariants,
  stockLevels,
  variantChannels,
  variantFacetValues,
  variantOptionValues,
} from "@openmers/db"
import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import type { Db } from "../../../platform"
import type { ProductSource, SourceChannel, SourcePrice } from "../build/types"
import { loadAssets, loadCollections, loadFacetValues, loadOptions } from "./loadExtras"

const group = <T, K extends string | number>(rows: T[], key: (r: T) => K) => {
  const out = new Map<K, T[]>()
  for (const r of rows) out.set(key(r), [...(out.get(key(r)) ?? []), r])
  return out
}

async function loadChannels(db: Db, productId: number): Promise<SourceChannel[]> {
  const rows = await db
    .select({
      id: channels.id,
      langs: channels.langs,
      defaultCurrency: channels.defaultCurrency,
      listCurrency: priceLists.currency,
    })
    .from(productChannels)
    .innerJoin(channels, eq(channels.id, productChannels.channelId))
    .leftJoin(priceLists, eq(priceLists.id, channels.defaultPriceListId))
    .where(eq(productChannels.productId, productId))
  return rows.map((r) => ({
    id: r.id,
    langs: r.langs,
    currency: r.listCurrency ?? r.defaultCurrency,
  }))
}

/** Tiers of each channel's default price list for the given variants. */
async function loadPrices(
  db: Db,
  channelIds: number[],
  variantIds: number[],
): Promise<SourcePrice[]> {
  if (channelIds.length === 0 || variantIds.length === 0) return []
  return db
    .select({
      channelId: channels.id,
      variantId: prices.variantId,
      minQty: prices.minQty,
      amount: prices.amount,
    })
    .from(channels)
    .innerJoin(prices, eq(prices.priceListId, channels.defaultPriceListId))
    .where(and(inArray(channels.id, channelIds), inArray(prices.variantId, variantIds)))
}

async function loadAvailable(db: Db, variantIds: number[]): Promise<Record<number, number>> {
  if (variantIds.length === 0) return {}
  const rows = await db
    .select({
      variantId: stockLevels.variantId,
      available: sql<number>`sum(${stockLevels.onHand} - ${stockLevels.reserved} - ${stockLevels.safety})`,
    })
    .from(stockLevels)
    .where(inArray(stockLevels.variantId, variantIds))
    .groupBy(stockLevels.variantId)
  return Object.fromEntries(rows.map((r) => [r.variantId, Number(r.available)]))
}

/**
 * Reads the write model of one product for the builders. `null` when the product is missing or deleted:
 * the job then only removes its read-model rows. Several reads, not one round trip (job path).
 */
export async function loadProductSource(
  db: Db,
  productPublicId: string,
): Promise<{ id: number; source: ProductSource | null } | null> {
  const product = (
    await db.select().from(products).where(eq(products.publicId, productPublicId)).limit(1)
  )[0]
  if (!product) return null
  if (product.deletedAt !== null) return { id: product.id, source: null }

  const variants = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.productId, product.id), isNull(productVariants.deletedAt)))
  const ids = variants.map((v) => v.id)

  const [translations, channelRows, vChannels, vOptions, vFacets, pFacets] = await Promise.all([
    db.select().from(productTranslations).where(eq(productTranslations.productId, product.id)),
    loadChannels(db, product.id),
    db.select().from(variantChannels).where(inArray(variantChannels.variantId, ids)),
    db.select().from(variantOptionValues).where(inArray(variantOptionValues.variantId, ids)),
    db.select().from(variantFacetValues).where(inArray(variantFacetValues.variantId, ids)),
    db.select().from(productFacetValues).where(eq(productFacetValues.productId, product.id)),
  ])
  const bases = variants.flatMap((v) => (v.baseVariantId === null ? [] : [v.baseVariantId]))
  const facetIds = [...new Set([...pFacets, ...vFacets].map((f) => f.facetValueId))]
  const [options, facetValues, assets, collections, priceRows, available] = await Promise.all([
    loadOptions(db, product.id),
    loadFacetValues(db, facetIds),
    loadAssets(db, product.id),
    loadCollections(db, ids),
    loadPrices(
      db,
      channelRows.map((c) => c.id),
      ids,
    ),
    loadAvailable(db, [...new Set([...ids, ...bases])]),
  ])

  const byVariant = {
    channels: group(vChannels, (r) => r.variantId),
    options: group(vOptions, (r) => r.variantId),
    facets: group(vFacets, (r) => r.variantId),
    collections: group(collections.memberships, (r) => r.variantId),
  }
  const source: ProductSource = {
    id: product.id,
    publicId: product.publicId,
    createdAt: product.createdAt,
    personalization: product.personalization ?? null,
    translations: translations.map((t) => ({
      lang: t.lang,
      channelId: t.channelId,
      name: t.name,
      slug: t.slug,
      description: t.description,
      seoTitle: t.seoTitle,
      seoDescription: t.seoDescription,
    })),
    variants: variants.map((v) => ({
      id: v.id,
      publicId: v.publicId,
      sku: v.sku,
      leadTimeDays: v.leadTimeDays,
      trackInventory: v.trackInventory,
      baseVariantId: v.baseVariantId,
      unitFactor: v.unitFactor,
      channelIds: (byVariant.channels.get(v.id) ?? []).map((r) => r.channelId),
      optionValueIds: (byVariant.options.get(v.id) ?? []).map((r) => r.optionValueId),
      facetValueIds: (byVariant.facets.get(v.id) ?? []).map((r) => r.facetValueId),
      collectionIds: (byVariant.collections.get(v.id) ?? []).map((r) => r.collectionId),
    })),
    productFacetValueIds: pFacets.map((f) => f.facetValueId),
    facetValues,
    options,
    assets,
    channels: channelRows,
    prices: priceRows,
    available,
    collectionChannels: collections.channels,
  }
  return { id: product.id, source }
}
