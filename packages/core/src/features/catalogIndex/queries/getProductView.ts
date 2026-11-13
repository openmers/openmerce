import { sql } from "drizzle-orm"
import { type AtomicStatement, sqlStatement } from "../../../platform"
import type { CatalogIndexCtx } from "./shared"

/** Product page: one `product_view` row by its PK `(channel_id, lang, slug)`. */
export function getProductViewQuery(input: {
  channelId: number
  lang: string
  slug: string
}): AtomicStatement {
  return sqlStatement(sql`SELECT data FROM product_view
    WHERE channel_id = ${input.channelId} AND lang = ${input.lang} AND slug = ${input.slug}`)
}

/** The ready presentation model, or `null` (unknown slug, other channel, unpublished). One round trip. */
export async function getProductView(
  ctx: CatalogIndexCtx,
  slug: string,
): Promise<Record<string, unknown> | null> {
  const [rows = []] = await ctx.platform.batch([
    getProductViewQuery({ channelId: ctx.channel.id, lang: ctx.lang, slug }),
  ])
  const data = rows[0]?.data
  return typeof data === "string" ? (JSON.parse(data) as Record<string, unknown>) : null
}
