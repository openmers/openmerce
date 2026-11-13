import {
  catalogIndex,
  catalogIndexCollections,
  catalogIndexFacets,
  productView,
} from "@openmers/db"
import { sql } from "drizzle-orm"
import type { JobHandler } from "../../../jobs/types"
import { type AtomicStatement, type Db, type Platform, sqlStatement } from "../../../platform"
import { buildIndex } from "../build/buildProductView"
import type { BuiltIndex } from "../build/types"
import { loadProductSource } from "../load/loadProductSource"

/** 02-ticaret `product_view`: a larger row is not written; the job fails and reports the product. */
export const PRODUCT_VIEW_MAX_BYTES = 512 * 1024

/**
 * Removes every read-model row of the product. FTS rows go first (by the old `catalog_index` rowids), then
 * the match rows by the old rows' own `facet_value_ids`/`collection_ids` (PK lookups, the match tables have
 * no product column), then the index and view rows.
 */
export function clearStatements(productId: number): AtomicStatement[] {
  const matchDelete = (table: string, column: string, json: string) =>
    sqlStatement(sql`DELETE FROM ${sql.identifier(table)}
      WHERE (channel_id, ${sql.identifier(column)}, variant_id) IN (
        SELECT ci.channel_id, j.value, ci.variant_id
        FROM catalog_index ci, json_each(ci.${sql.identifier(json)}) j
        WHERE ci.product_id = ${productId})`)
  return [
    sqlStatement(sql`DELETE FROM catalog_fts
      WHERE rowid IN (SELECT rowid FROM catalog_index WHERE product_id = ${productId})`),
    matchDelete("catalog_index_facets", "facet_value_id", "facet_value_ids"),
    matchDelete("catalog_index_collections", "collection_id", "collection_ids"),
    sqlStatement(sql`DELETE FROM catalog_index WHERE product_id = ${productId}`),
    sqlStatement(sql`DELETE FROM product_view WHERE product_id = ${productId}`),
  ]
}

/** Inserts in write order; one statement per row keeps every statement under D1's bound-parameter limit. */
export function writeStatements(db: Db, built: BuiltIndex): AtomicStatement[] {
  const out: AtomicStatement[] = []
  for (const { fts, ...row } of built.rows) {
    out.push(db.insert(catalogIndex).values(row).toSQL())
    if (!fts) continue
    out.push(
      sqlStatement(sql`INSERT INTO catalog_fts (rowid, name, sku, facet_text, description_excerpt)
        SELECT rowid, ${fts.name}, ${fts.sku}, ${fts.facetText}, ${fts.descriptionExcerpt}
        FROM catalog_index
        WHERE channel_id = ${row.channelId} AND lang = ${row.lang} AND variant_id = ${row.variantId}`),
    )
  }
  for (const m of built.facets) {
    const values = { channelId: m.channelId, facetValueId: m.id, variantId: m.variantId }
    out.push(db.insert(catalogIndexFacets).values(values).onConflictDoNothing().toSQL())
  }
  for (const m of built.collections) {
    const values = { channelId: m.channelId, collectionId: m.id, variantId: m.variantId }
    out.push(db.insert(catalogIndexCollections).values(values).onConflictDoNothing().toSQL())
  }
  for (const view of built.views) {
    // a stale row of another product may still hold the slug; that product's own reindex rewrites it
    out.push(
      db
        .insert(productView)
        .values(view)
        .onConflictDoUpdate({
          target: [productView.channelId, productView.lang, productView.slug],
          set: { productId: view.productId, data: view.data },
        })
        .toSQL(),
    )
  }
  return out
}

/**
 * 15.7: rewrites every `(channel, language)` row of the product in one `atomic()` (idempotent; a deleted
 * or unassigned product ends with no rows). Purges the product's cache tag afterwards.
 */
export async function reindexProduct(platform: Platform, productPublicId: string): Promise<void> {
  const loaded = await loadProductSource(platform.db, productPublicId)
  if (!loaded) return
  const built: BuiltIndex = loaded.source
    ? buildIndex(loaded.source)
    : { rows: [], facets: [], collections: [], views: [] }
  for (const view of built.views) {
    if (new TextEncoder().encode(JSON.stringify(view.data)).length > PRODUCT_VIEW_MAX_BYTES) {
      throw new Error(`PRODUCT_VIEW_TOO_LARGE: ${productPublicId} (${view.lang})`)
    }
  }
  await platform.atomic([...clearStatements(loaded.id), ...writeStatements(platform.db, built)])
  await platform.purge([`prod:${productPublicId}`])
}

/** Outbox handler of the `reindex` job (`product.changed`); duplicates are merged by the outbox `dedupe_key`. */
export const reindexProductHandler: JobHandler = async (job, { platform }) => {
  const product = job.payload.product
  if (typeof product !== "string" || product === "") {
    throw new Error("INVALID_PAYLOAD: reindex needs payload.product")
  }
  await reindexProduct(platform, product)
}
