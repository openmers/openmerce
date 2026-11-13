import { priceLists } from "@openmers/db"
import { asc, desc, eq } from "drizzle-orm"
import type { Db } from "../../../platform"
import type { PriceListType, PricingCtx } from "../types"

export type PriceListItem = {
  publicId: string
  name: string
  currency: string
  type: PriceListType
  priority: number
  startsAt: number | null
  endsAt: number | null
  includesTax: boolean
  status: "active" | "expired"
  createdAt: number
  updatedAt: number
}

/** Kanalın listeleri; `(channel_id, type)` indeksinden yürür. Kanal başına liste sayısı küçüktür. */
export function listPriceListsQuery(db: Db, channelId: number) {
  return db
    .select({
      publicId: priceLists.publicId,
      name: priceLists.name,
      currency: priceLists.currency,
      type: priceLists.type,
      priority: priceLists.priority,
      startsAt: priceLists.startsAt,
      endsAt: priceLists.endsAt,
      includesTax: priceLists.includesTax,
      status: priceLists.status,
      createdAt: priceLists.createdAt,
      updatedAt: priceLists.updatedAt,
    })
    .from(priceLists)
    .where(eq(priceLists.channelId, channelId))
    .orderBy(asc(priceLists.type), desc(priceLists.priority), asc(priceLists.publicId))
}

export async function listPriceLists(ctx: Pick<PricingCtx, "platform" | "channel">) {
  const rows: PriceListItem[] = await listPriceListsQuery(ctx.platform.db, ctx.channel.id)
  return rows
}
