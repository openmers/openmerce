import { productVariants, stockLevels, stockLocations } from "@openmers/db"
import { eq, type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, type Db, guardedInsertStatement } from "../../../platform"
import { variantIdByPublicId } from "../../catalog/products/statements"
import type { BucketThresholds } from "../bucket/stockBucket"
import { StockError } from "../types"

export function locationIdByPublicId(publicId: string): SQL {
  return sql`(SELECT ${stockLocations.id} FROM ${stockLocations} WHERE ${stockLocations.publicId} = ${publicId})`
}

/** A variant that can carry a stock row: not deleted and not a bundle (04-stok §8: bundles have no row). */
function stockVariantGuard(variantPublicId: string): SQL {
  return sql`EXISTS (SELECT 1 FROM ${productVariants}
    WHERE ${productVariants.publicId} = ${variantPublicId}
      AND ${productVariants.deletedAt} IS NULL
      AND ${productVariants.baseVariantId} IS NULL)`
}

/** Opens the level row at zero if missing (when the variant and warehouse are valid); leaves it alone otherwise. */
export function ensureLevelStatement(
  variantPublicId: string,
  locationPublicId: string,
  now: number,
): AtomicStatement {
  const stmt = guardedInsertStatement(
    stockLevels,
    {
      variantId: variantIdByPublicId(variantPublicId),
      locationId: locationIdByPublicId(locationPublicId),
      createdAt: now,
      updatedAt: now,
    },
    sql`${stockVariantGuard(variantPublicId)} AND EXISTS (SELECT 1 FROM ${stockLocations}
      WHERE ${stockLocations.publicId} = ${locationPublicId})`,
  )
  return { ...stmt, sql: `${stmt.sql} on conflict do nothing` }
}

/** Condition on the level row (alias `s`); `cond` is the row condition (e.g. `s.on_hand + ? >= 0`). */
export function levelGuard(variantId: SQL, locationId: SQL, cond: SQL): SQL {
  return sql`EXISTS (SELECT 1 FROM "stock_levels" s
    WHERE s."variant_id" = ${variantId} AND s."location_id" = ${locationId} AND ${cond})`
}

/** The variant's sellable across all warehouses (`on_hand − reserved − safety`); walks the PK prefix. */
function availableSql(variantId: SQL): SQL {
  return sql`(SELECT coalesce(sum("on_hand" - "reserved" - "safety"), 0)
    FROM "stock_levels" WHERE "variant_id" = ${variantId})`
}

function bucketSql(available: SQL, t: BucketThresholds): SQL {
  return sql`(CASE WHEN ${available} <= 0 THEN 'out'
    WHEN ${available} <= ${t.low} THEN 'low' ELSE 'in_stock' END)`
}

/**
 * The same rule as `stockBucket`, in SQL: true if the bucket of the sellable read **before** the write differs from
 * the bucket after `+ delta`. The `reindex` statement comes before the update.
 */
export function bucketChangeGuard(variantId: SQL, delta: SQL, t: BucketThresholds): SQL {
  const before = availableSql(variantId)
  return sql`${bucketSql(before, t)} <> ${bucketSql(sql`(${before} + ${delta})`, t)}`
}

/** 0 rows: `NOT_FOUND` if the variant/warehouse is missing, `INVALID_INPUT` for a bundle variant; returns otherwise. */
export async function classifyLevelMiss(
  db: Db,
  variantPublicId: string,
  locationPublicId: string,
): Promise<void> {
  const variant = (
    await db
      .select({ deletedAt: productVariants.deletedAt, base: productVariants.baseVariantId })
      .from(productVariants)
      .where(eq(productVariants.publicId, variantPublicId))
      .limit(1)
  )[0]
  if (!variant || variant.deletedAt !== null)
    throw new StockError("NOT_FOUND", "varyant bulunamadı")
  if (variant.base !== null) {
    throw new StockError("INVALID_INPUT", "paket varyantına stok yazılamaz (taban varyanta yazın)")
  }
  const location = await db
    .select({ id: stockLocations.id })
    .from(stockLocations)
    .where(eq(stockLocations.publicId, locationPublicId))
    .limit(1)
  if (location.length === 0) throw new StockError("NOT_FOUND", "depo bulunamadı")
}
