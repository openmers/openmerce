import { stockLevels, stockMovements } from "@openmers/db"
import { type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, affected, guardedInsertStatement } from "../../../platform"
import { auditStatement } from "../../audit"
import { reindexForVariantStatement } from "../../catalog/products/reindexForVariant"
import { variantIdByPublicId } from "../../catalog/products/statements"
import { auditActorOf } from "../../catalog/products/types"
import { type BucketThresholds, DEFAULT_BUCKET_THRESHOLDS } from "../bucket/stockBucket"
import { assertCount, type StockCtx, StockError } from "../types"
import {
  bucketChangeGuard,
  classifyLevelMiss,
  ensureLevelStatement,
  levelGuard,
  locationIdByPublicId,
} from "./statements"

export type SetStockInput = {
  variantPublicId: string
  locationPublicId: string
  /** Absolute on-hand quantity (count / ERP); `reserved` is left untouched (04-stok §4). */
  onHand: number
  safety?: number
  /** If given, the write is conditional on this version (`version` protected); `CONFLICT` on mismatch. */
  version?: number
  thresholds?: BucketThresholds
}

/**
 * Absolute stock write: level + movement (`units` = new − old, read before the update) +
 * audit (+ `reindex` if the bucket changed) in one `atomic()`. If the row is missing it is opened at zero.
 */
export async function setStock(
  ctx: StockCtx,
  input: SetStockInput,
): Promise<{ version: number | null }> {
  assertCount(input.onHand, "eldeki miktar")
  if (input.safety !== undefined) assertCount(input.safety, "güvenlik stoku")
  if (input.version !== undefined) assertCount(input.version, "sürüm")
  const p = ctx.platform
  const variantId = variantIdByPublicId(input.variantPublicId)
  const locationId = locationIdByPublicId(input.locationPublicId)
  const versionOk = input.version === undefined ? sql`1 = 1` : sql`s."version" = ${input.version}`
  const fits = levelGuard(variantId, locationId, versionOk)
  const current = sql`(SELECT "on_hand" FROM "stock_levels"
    WHERE "variant_id" = ${variantId} AND "location_id" = ${locationId})`
  const currentSafety = sql`(SELECT "safety" FROM "stock_levels"
    WHERE "variant_id" = ${variantId} AND "location_id" = ${locationId})`
  const safety = input.safety ?? null
  // Sellable delta: on_hand delta − safety delta (the bucket is computed from this).
  const delta = sql`(${input.onHand} - ${current} - coalesce(${safety} - ${currentSafety}, 0))`
  const thresholds = input.thresholds ?? DEFAULT_BUCKET_THRESHOLDS

  const stmts: AtomicStatement[] = [
    ensureLevelStatement(input.variantPublicId, input.locationPublicId, ctx.now),
    guardedInsertStatement(
      stockMovements,
      {
        variantId,
        locationId,
        kind: "adjustment",
        quantity: sql`${input.onHand} - ${current}`,
        units: sql`${input.onHand} - ${current}`,
        refType: "manual",
        createdAt: ctx.now,
      },
      fits,
    ),
    auditStatement(
      p.db,
      {
        actor: auditActorOf(ctx),
        action: "stock:write",
        entityType: "stock_level",
        entityPublicId: input.variantPublicId,
        channelId: ctx.channel.id,
        after: {
          variant: input.variantPublicId,
          location: input.locationPublicId,
          onHand: input.onHand,
          safety: input.safety,
        },
        requestId: ctx.requestId,
      },
      ctx.now,
      fits,
    ),
    reindexForVariantStatement(
      variantId,
      ctx.now,
      sql`${fits} AND ${bucketChangeGuard(variantId, delta, thresholds)}` as SQL,
      ctx.requestId,
    ),
    p.db
      .update(stockLevels)
      .set({
        onHand: input.onHand,
        ...(input.safety !== undefined ? { safety: input.safety } : {}),
        version: sql`${stockLevels.version} + 1`,
        updatedAt: ctx.now,
      })
      .where(
        sql`${stockLevels.variantId} = ${variantId} AND ${stockLevels.locationId} = ${locationId}
          ${input.version === undefined ? sql`` : sql`AND ${stockLevels.version} = ${input.version}`}`,
      )
      .toSQL(),
  ]

  const result = await p.atomic(stmts)
  if (!affected(result, stmts.length - 1)) {
    await classifyLevelMiss(p.db, input.variantPublicId, input.locationPublicId)
    throw new StockError("CONFLICT", "sürüm çakışması: stok başka bir yazımla değişti")
  }
  return { version: input.version === undefined ? null : input.version + 1 }
}
