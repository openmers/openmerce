import { priceLists, priceListTargets, prices } from "@openmers/db"
import { and, eq, ne, sql } from "drizzle-orm"
import { type AtomicStatement, affected } from "../../../platform"
import { auditStatement } from "../../audit"
import { auditActorOf } from "../../catalog/products/types"
import { mapPricingWriteError, type PricingCtx, PricingError } from "../types"
import { findPriceList, priceListGuard, priceListIdByPublicId } from "./statements"

/**
 * `base` olmayan listeyi fiyatları ve hedefleriyle tek `atomic()`'te siler (hepsi aynı koşula
 * bağlı). `base` liste silinemez (`CONFLICT`): kanalın satış yapabilmesi ona bağlıdır.
 */
export async function deletePriceList(
  ctx: PricingCtx,
  input: { publicId: string },
): Promise<{ publicId: string }> {
  const p = ctx.platform
  const channelId = ctx.channel.id
  const notBase = sql`${priceLists.type} <> 'base'`
  const guard = priceListGuard(input.publicId, channelId, notBase)
  const listId = priceListIdByPublicId(input.publicId, channelId)

  const stmts: AtomicStatement[] = [
    auditStatement(
      p.db,
      {
        actor: auditActorOf(ctx),
        action: "prices:write",
        entityType: "price_list",
        entityPublicId: input.publicId,
        channelId,
        after: { publicId: input.publicId, deleted: true },
        requestId: ctx.requestId,
      },
      ctx.now,
      guard,
    ),
    p.db
      .delete(prices)
      .where(and(sql`${prices.priceListId} = ${listId}`, guard))
      .toSQL(),
    p.db
      .delete(priceListTargets)
      .where(and(sql`${priceListTargets.priceListId} = ${listId}`, guard))
      .toSQL(),
    p.db
      .delete(priceLists)
      .where(
        and(
          eq(priceLists.publicId, input.publicId),
          eq(priceLists.channelId, channelId),
          ne(priceLists.type, "base"),
        ),
      )
      .toSQL(),
  ]

  let result: number[]
  try {
    result = await p.atomic(stmts)
  } catch (error) {
    mapPricingWriteError(error)
  }
  if (!affected(result, stmts.length - 1)) {
    await findPriceList(p.db, input.publicId, channelId)
    throw new PricingError("CONFLICT", "base liste silinemez")
  }
  return { publicId: input.publicId }
}
