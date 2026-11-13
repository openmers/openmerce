import {
  collectionChannels,
  collections,
  collectionVariants,
  facets,
  facetTranslations,
  facetValues,
  facetValueTranslations,
  media,
  optionValues,
  optionValueTranslations,
  productAssets,
  productOptions,
  productOptionTranslations,
} from "@openmers/db"
import { and, eq, inArray, isNull } from "drizzle-orm"
import type { Db } from "../../../platform"
import type { Names, SourceAsset, SourceFacetValue, SourceOption } from "../build/types"

// Option, facet, asset and collection reads of the reindex loader (job path, not the storefront).

function namesOf<K>(rows: { key: K; lang: string; name: string }[], key: K): Names {
  return Object.fromEntries(rows.filter((r) => r.key === key).map((r) => [r.lang, r.name]))
}

export async function loadOptions(db: Db, productId: number): Promise<SourceOption[]> {
  const options = await db
    .select()
    .from(productOptions)
    .where(eq(productOptions.productId, productId))
  if (options.length === 0) return []
  const optionIds = options.map((o) => o.id)
  const values = await db
    .select()
    .from(optionValues)
    .where(inArray(optionValues.optionId, optionIds))
  const valueIds = values.map((v) => v.id)
  const optionNames = await db
    .select({
      key: productOptionTranslations.optionId,
      lang: productOptionTranslations.lang,
      name: productOptionTranslations.name,
    })
    .from(productOptionTranslations)
    .where(inArray(productOptionTranslations.optionId, optionIds))
  const valueNames = valueIds.length
    ? await db
        .select({
          key: optionValueTranslations.optionValueId,
          lang: optionValueTranslations.lang,
          name: optionValueTranslations.name,
        })
        .from(optionValueTranslations)
        .where(inArray(optionValueTranslations.optionValueId, valueIds))
    : []
  return options.map((o) => ({
    id: o.id,
    code: o.code,
    position: o.position,
    names: namesOf(optionNames, o.id),
    values: values
      .filter((v) => v.optionId === o.id)
      .map((v) => ({
        id: v.id,
        code: v.code,
        position: v.position,
        names: namesOf(valueNames, v.id),
      })),
  }))
}

export async function loadFacetValues(db: Db, ids: number[]): Promise<SourceFacetValue[]> {
  if (ids.length === 0) return []
  const rows = await db
    .select({
      id: facetValues.id,
      code: facetValues.code,
      facetId: facets.id,
      facetCode: facets.code,
      private: facets.private,
    })
    .from(facetValues)
    .innerJoin(facets, eq(facets.id, facetValues.facetId))
    .where(inArray(facetValues.id, ids))
  const facetIds = [...new Set(rows.map((r) => r.facetId))]
  const facetNames = await db
    .select({
      key: facetTranslations.facetId,
      lang: facetTranslations.lang,
      name: facetTranslations.name,
    })
    .from(facetTranslations)
    .where(inArray(facetTranslations.facetId, facetIds))
  const valueNames = await db
    .select({
      key: facetValueTranslations.facetValueId,
      lang: facetValueTranslations.lang,
      name: facetValueTranslations.name,
    })
    .from(facetValueTranslations)
    .where(inArray(facetValueTranslations.facetValueId, ids))
  return rows.map((r) => ({
    id: r.id,
    facetCode: r.facetCode,
    code: r.code,
    private: r.private,
    facetNames: namesOf(facetNames, r.facetId),
    names: namesOf(valueNames, r.id),
  }))
}

/** Assets whose media is ready and public; private or pending media never reaches the storefront. */
export async function loadAssets(db: Db, productId: number): Promise<SourceAsset[]> {
  const rows = await db
    .select({
      variantId: productAssets.variantId,
      optionValueId: productAssets.optionValueId,
      position: productAssets.position,
      key: media.key,
      width: media.width,
      height: media.height,
      sizes: media.sizes,
    })
    .from(productAssets)
    .innerJoin(media, eq(media.id, productAssets.assetId))
    .where(
      and(
        eq(productAssets.productId, productId),
        eq(media.status, "ready"),
        eq(media.bucket, "public"),
      ),
    )
  return rows.map((r) => ({
    variantId: r.variantId,
    optionValueId: r.optionValueId,
    position: r.position,
    image: { key: r.key, width: r.width, height: r.height, sizes: r.sizes ?? [] },
  }))
}

/** Variant → collections (not deleted) and collection → visible channels. */
export async function loadCollections(db: Db, variantIds: number[]) {
  const memberships = variantIds.length
    ? await db
        .select({ variantId: collectionVariants.variantId, collectionId: collections.id })
        .from(collectionVariants)
        .innerJoin(collections, eq(collections.id, collectionVariants.collectionId))
        .where(
          and(inArray(collectionVariants.variantId, variantIds), isNull(collections.deletedAt)),
        )
    : []
  const ids = [...new Set(memberships.map((m) => m.collectionId))]
  const links = ids.length
    ? await db
        .select()
        .from(collectionChannels)
        .where(inArray(collectionChannels.collectionId, ids))
    : []
  const channels: Record<number, number[]> = {}
  for (const l of links)
    channels[l.collectionId] = [...(channels[l.collectionId] ?? []), l.channelId]
  return { memberships, channels }
}
