import { sql } from "drizzle-orm"
import { type Platform, sqlStatement } from "../../../platform"
import { type ImageView, imageView } from "../links/mediaUrl"

export type MediaListItem = {
  id: string
  bucket: "public" | "private"
  mime: string | null
  bytes: number | null
  /** Public items only; private ones are reached through a signed link. */
  image: ImageView | null
  createdAt: number
}

export const MEDIA_PAGE_MAX = 100

/**
 * Admin library: ready items not owned by a cart/order, newest first, keyset on the id.
 * shortcut: no index on `(owner_kind, id)`; the PK walk filters the rows, add one if libraries grow.
 */
export async function listMedia(
  ctx: { platform: Pick<Platform, "batch" | "storage"> },
  input: { cursor?: number; limit?: number },
): Promise<{ items: MediaListItem[]; nextCursor: number | null }> {
  const limit = Math.min(Math.max(1, input.limit ?? 50), MEDIA_PAGE_MAX)
  const after = input.cursor === undefined ? sql`` : sql`AND "id" < ${input.cursor}`
  const [rows = []] = await ctx.platform.batch([
    sqlStatement(sql`SELECT "id", "public_id", "bucket", "key", "mime", "bytes", "width", "height",
        "sizes", "created_at" FROM "media"
      WHERE "status" = 'ready' AND "owner_kind" IS NULL ${after}
      ORDER BY "id" DESC LIMIT ${limit + 1}`),
  ])
  const page = rows.slice(0, limit)
  const num = (v: unknown) => (v === null ? null : Number(v))
  const items = page.map((r) => ({
    id: String(r.public_id),
    bucket: r.bucket as MediaListItem["bucket"],
    mime: r.mime === null ? null : String(r.mime),
    bytes: num(r.bytes),
    image:
      r.bucket === "public"
        ? imageView(ctx.platform.storage, {
            key: String(r.key),
            width: num(r.width),
            height: num(r.height),
            sizes: typeof r.sizes === "string" ? (JSON.parse(r.sizes) as number[]) : [],
          })
        : null,
    createdAt: Number(r.created_at),
  }))
  const last = page.at(-1)
  return { items, nextCursor: rows.length > limit && last ? Number(last.id) : null }
}
