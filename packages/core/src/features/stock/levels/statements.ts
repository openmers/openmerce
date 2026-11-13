import { productVariants, stockLevels, stockLocations } from "@openmers/db"
import { eq, type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, type Db, guardedInsertStatement } from "../../../platform"
import { variantIdByPublicId } from "../../catalog/products/statements"
import type { BucketThresholds } from "../bucket/stockBucket"
import { StockError } from "../types"

export function locationIdByPublicId(publicId: string): SQL {
  return sql`(SELECT ${stockLocations.id} FROM ${stockLocations} WHERE ${stockLocations.publicId} = ${publicId})`
}

/** Stok satırı taşıyabilen varyant: silinmemiş ve paket değil (04-stok §8: paketin satırı yok). */
function stockVariantGuard(variantPublicId: string): SQL {
  return sql`EXISTS (SELECT 1 FROM ${productVariants}
    WHERE ${productVariants.publicId} = ${variantPublicId}
      AND ${productVariants.deletedAt} IS NULL
      AND ${productVariants.baseVariantId} IS NULL)`
}

/** Seviye satırı yoksa sıfırla açar (varyant ve depo geçerliyse); varsa dokunmaz. */
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

/** Seviye satırının koşulu (`s` takma adıyla); `cond` satır koşuludur (ör. `s.on_hand + ? >= 0`). */
export function levelGuard(variantId: SQL, locationId: SQL, cond: SQL): SQL {
  return sql`EXISTS (SELECT 1 FROM "stock_levels" s
    WHERE s."variant_id" = ${variantId} AND s."location_id" = ${locationId} AND ${cond})`
}

/** Varyantın bütün depolardaki satılabiliri (`on_hand − reserved − safety`); PK önekinden yürür. */
function availableSql(variantId: SQL): SQL {
  return sql`(SELECT coalesce(sum("on_hand" - "reserved" - "safety"), 0)
    FROM "stock_levels" WHERE "variant_id" = ${variantId})`
}

function bucketSql(available: SQL, t: BucketThresholds): SQL {
  return sql`(CASE WHEN ${available} <= 0 THEN 'out'
    WHEN ${available} <= ${t.low} THEN 'low' ELSE 'in_stock' END)`
}

/**
 * `stockBucket` ile aynı kural, SQL'de: yazımdan **önce** okunan satılabilir ile `+ delta`
 * sonrası kovası farklıysa doğru. `reindex` ifadesi güncellemeden önce gelir.
 */
export function bucketChangeGuard(variantId: SQL, delta: SQL, t: BucketThresholds): SQL {
  const before = availableSql(variantId)
  return sql`${bucketSql(before, t)} <> ${bucketSql(sql`(${before} + ${delta})`, t)}`
}

/** 0 satır: varyant/depo yoksa `NOT_FOUND`, paket varyantıysa `INVALID_INPUT`; yoksa döner. */
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
