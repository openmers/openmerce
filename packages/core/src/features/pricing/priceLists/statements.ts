import { priceLists } from "@openmers/db"
import { and, eq, type SQL, sql } from "drizzle-orm"
import type { Db } from "../../../platform"
import { PricingError } from "../types"

// Lists are channel-scoped: an admin only writes/reads the lists of `ctx.channel`.

export function priceListIdByPublicId(publicId: string, channelId: number): SQL {
  return sql`(SELECT ${priceLists.id} FROM ${priceLists}
    WHERE ${priceLists.publicId} = ${publicId} AND ${priceLists.channelId} = ${channelId})`
}

/** Condition that the list exists in this channel; `extra` is an additional row condition (e.g. `type <> 'base'`). */
export function priceListGuard(publicId: string, channelId: number, extra?: SQL): SQL {
  return sql`EXISTS (SELECT 1 FROM ${priceLists}
    WHERE ${priceLists.publicId} = ${publicId} AND ${priceLists.channelId} = ${channelId}
    ${extra ? sql`AND ${extra}` : sql``})`
}

/** A conditional write touched 0 rows: `NOT_FOUND` if the list is missing, otherwise returns the row (the caller classifies). */
export async function findPriceList(
  db: Db,
  publicId: string,
  channelId: number,
): Promise<{ type: string }> {
  const row = (
    await db
      .select({ type: priceLists.type })
      .from(priceLists)
      .where(and(eq(priceLists.publicId, publicId), eq(priceLists.channelId, channelId)))
      .limit(1)
  )[0]
  if (!row) throw new PricingError("NOT_FOUND", "fiyat listesi bulunamadı")
  return row
}
