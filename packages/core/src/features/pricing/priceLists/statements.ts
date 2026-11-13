import { priceLists } from "@openmers/db"
import { and, eq, type SQL, sql } from "drizzle-orm"
import type { Db } from "../../../platform"
import { PricingError } from "../types"

// Liste kanal kapsamlıdır: yönetici yalnız `ctx.channel`'ın listelerine yazar/okur.

export function priceListIdByPublicId(publicId: string, channelId: number): SQL {
  return sql`(SELECT ${priceLists.id} FROM ${priceLists}
    WHERE ${priceLists.publicId} = ${publicId} AND ${priceLists.channelId} = ${channelId})`
}

/** Listenin bu kanalda var olduğu koşul; `extra` ek satır koşuludur (ör. `type <> 'base'`). */
export function priceListGuard(publicId: string, channelId: number, extra?: SQL): SQL {
  return sql`EXISTS (SELECT 1 FROM ${priceLists}
    WHERE ${priceLists.publicId} = ${publicId} AND ${priceLists.channelId} = ${channelId}
    ${extra ? sql`AND ${extra}` : sql``})`
}

/** Koşullu yazım 0 satıra dokundu: liste yoksa `NOT_FOUND`, varsa satırı döner (çağıran sınıflar). */
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
