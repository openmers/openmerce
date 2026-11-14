import { sql } from "drizzle-orm"
import { type AtomicStatement, type Storage, sqlStatement } from "../../../platform"
import { imageView, type StoredImage } from "../../media"
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

type View = Record<string, unknown> & {
  images?: StoredImage[]
  variants?: { images?: StoredImage[] }[]
}

/** Stored image refs → ready URLs + `srcset`; keys stay inside (the CDN base may change without a reindex). */
function withImageUrls(storage: Pick<Storage, "url">, view: View): Record<string, unknown> {
  const urls = (list: StoredImage[] | undefined) => (list ?? []).map((i) => imageView(storage, i))
  return {
    ...view,
    images: urls(view.images),
    variants: (view.variants ?? []).map((v) => ({ ...v, images: urls(v.images) })),
  }
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
  return typeof data === "string"
    ? withImageUrls(ctx.platform.storage, JSON.parse(data) as View)
    : null
}
