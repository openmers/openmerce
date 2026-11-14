import { type SQL, sql } from "drizzle-orm"
import { affected, sqlStatement } from "../../../platform"
import { sizedKey } from "../images/sizeLadder"
import { type MediaCtx, MediaError } from "../types"

/**
 * No usage row points at `media` (alias of the outer row). Every usage column is listed here;
 * a new usage table must be added or deletes would orphan it (the FK would then refuse instead).
 */
export const notUsed: SQL = sql`NOT EXISTS (SELECT 1 FROM "product_assets" WHERE "asset_id" = "media"."id")
  AND NOT EXISTS (SELECT 1 FROM "digital_assets" WHERE "media_id" = "media"."id")
  AND NOT EXISTS (SELECT 1 FROM "digital_entitlements" WHERE "media_id" = "media"."id")
  AND NOT EXISTS (SELECT 1 FROM "fulfillments" WHERE "label_media_id" = "media"."id")
  AND NOT EXISTS (SELECT 1 FROM "media" m2 WHERE m2."poster_media_id" = "media"."id")`

/** Object keys of a row: the original plus its generated sizes. */
export function objectKeys(key: string, sizes: unknown): string[] {
  const list = typeof sizes === "string" ? (JSON.parse(sizes) as unknown) : sizes
  const widths = Array.isArray(list) ? list.filter((w): w is number => typeof w === "number") : []
  return [key, ...widths.map((w) => sizedKey(key, w))]
}

/**
 * Deletes a library media item (12-medya): one conditional statement `DELETE … WHERE NOT EXISTS
 * (usages)`, so a concurrent "attach" either lands first (delete refused) or hits the FK. Customer
 * uploads (owned by a cart/order) are not library items. Objects are removed after the row.
 */
export async function deleteMedia(ctx: MediaCtx, input: { id: string }): Promise<void> {
  const p = ctx.platform
  const [rows = []] = await p.batch([
    sqlStatement(sql`SELECT "key", "sizes" FROM "media"
      WHERE "public_id" = ${input.id} AND "owner_kind" IS NULL`),
  ])
  const row = rows[0]
  if (!row) throw new MediaError("NOT_FOUND", "media not found")
  const result = await p.atomic([
    sqlStatement(sql`DELETE FROM "media" WHERE "public_id" = ${input.id}
      AND "owner_kind" IS NULL AND ${notUsed}`),
  ])
  if (!affected(result, 0)) throw new MediaError("IN_USE", "media is in use")
  await Promise.allSettled(objectKeys(String(row.key), row.sizes).map((k) => p.storage.delete(k)))
}
