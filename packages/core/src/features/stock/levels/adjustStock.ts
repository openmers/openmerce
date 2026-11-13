import { stockLevels, stockMovements } from "@openmers/db"
import { type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, affected, guardedInsertStatement } from "../../../platform"
import { auditStatement } from "../../audit"
import { reindexForVariantStatement } from "../../catalog/products/reindexForVariant"
import { variantIdByPublicId } from "../../catalog/products/statements"
import { auditActorOf } from "../../catalog/products/types"
import { type BucketThresholds, DEFAULT_BUCKET_THRESHOLDS } from "../bucket/stockBucket"
import { type StockCtx, StockError } from "../types"
import {
  bucketChangeGuard,
  classifyLevelMiss,
  ensureLevelStatement,
  levelGuard,
  locationIdByPublicId,
} from "./statements"

export type AdjustStockInput = {
  variantPublicId: string
  locationPublicId: string
  /** Signed `on_hand` delta (count correction); cannot be 0. */
  delta: number
  thresholds?: BucketThresholds
}

/**
 * Manual adjustment (04-stok `adjustment`): level + `stock_movements` + audit (+ `reindex` if the bucket
 * changed) in the **same** `atomic()`. If the row is missing it is opened at zero. If the resulting `on_hand` is negative no
 * row is written (`INVALID_INPUT`). Conditional rows come before the update and are bound to the same
 * condition as the update; no write can interleave within the same transaction, so both hold or neither does.
 */
export async function adjustStock(
  ctx: StockCtx,
  input: AdjustStockInput,
): Promise<{ applied: true }> {
  const { delta } = input
  if (!Number.isSafeInteger(delta) || delta === 0) {
    throw new StockError("INVALID_INPUT", "fark sıfırdan farklı tamsayı olmalı")
  }
  const p = ctx.platform
  const variantId = variantIdByPublicId(input.variantPublicId)
  const locationId = locationIdByPublicId(input.locationPublicId)
  const fits = levelGuard(variantId, locationId, sql`s."on_hand" + ${delta} >= 0`)
  const thresholds = input.thresholds ?? DEFAULT_BUCKET_THRESHOLDS

  const stmts: AtomicStatement[] = [
    ensureLevelStatement(input.variantPublicId, input.locationPublicId, ctx.now),
    guardedInsertStatement(
      stockMovements,
      {
        variantId,
        locationId,
        kind: "adjustment",
        quantity: delta,
        units: delta,
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
        after: { variant: input.variantPublicId, location: input.locationPublicId, delta },
        requestId: ctx.requestId,
      },
      ctx.now,
      fits,
    ),
    reindexForVariantStatement(
      variantId,
      ctx.now,
      sql`${fits} AND ${bucketChangeGuard(variantId, sql`${delta}`, thresholds)}` as SQL,
      ctx.requestId,
    ),
    p.db
      .update(stockLevels)
      .set({
        onHand: sql`${stockLevels.onHand} + ${delta}`,
        version: sql`${stockLevels.version} + 1`,
        updatedAt: ctx.now,
      })
      .where(
        sql`${stockLevels.variantId} = ${variantId} AND ${stockLevels.locationId} = ${locationId}
          AND ${stockLevels.onHand} + ${delta} >= 0`,
      )
      .toSQL(),
  ]

  const result = await p.atomic(stmts)
  if (!affected(result, stmts.length - 1)) {
    await classifyLevelMiss(p.db, input.variantPublicId, input.locationPublicId)
    throw new StockError("INVALID_INPUT", "eldeki stok negatife düşemez")
  }
  return { applied: true }
}
