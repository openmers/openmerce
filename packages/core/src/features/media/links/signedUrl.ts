import { sql } from "drizzle-orm"
import { type Platform, sqlStatement } from "../../../platform"
import { LINK_TTL_SECONDS, MediaError } from "../types"

/**
 * A short-lived read link for a `private` media item (invoices, exports, customer uploads):
 * 15 minutes by default (12-medya). Public media is served by URL, never signed.
 */
export async function privateLink(
  ctx: { platform: Pick<Platform, "batch" | "storage">; now: number },
  input: { id: string; ttlSeconds?: number },
): Promise<{ url: string; expiresAt: number }> {
  const [rows = []] = await ctx.platform.batch([
    sqlStatement(sql`SELECT "key" FROM "media"
      WHERE "public_id" = ${input.id} AND "bucket" = 'private' AND "status" = 'ready'`),
  ])
  const key = rows[0]?.key
  if (typeof key !== "string") throw new MediaError("NOT_FOUND", "media not found")
  const expiresIn = input.ttlSeconds ?? LINK_TTL_SECONDS
  const url = await ctx.platform.storage.signedUrl(key, {
    method: "GET",
    expiresIn,
    now: ctx.now,
  })
  return { url, expiresAt: ctx.now + expiresIn * 1000 }
}
