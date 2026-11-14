import { sql } from "drizzle-orm"
import { sqlStatement } from "../../../platform"
import { type MediaCtx, PENDING_TTL_MS } from "../types"
import { removeRows, SWEEP_LIMIT } from "./removeRows"

/**
 * Uploads never confirmed within an hour (and rejected rows of the same age) are removed with
 * their objects (12-medya). Uses `media_status_created_idx`; one batch per call.
 */
export async function sweepPending(ctx: MediaCtx, input: { limit?: number } = {}): Promise<number> {
  const before = ctx.now - PENDING_TTL_MS
  const stale = sql`"status" IN ('pending', 'rejected') AND "created_at" < ${before}`
  const [rows = []] = await ctx.platform.batch([
    sqlStatement(sql`SELECT "id", "key", "sizes" FROM "media" WHERE ${stale}
      LIMIT ${input.limit ?? SWEEP_LIMIT}`),
  ])
  return removeRows(ctx, rows, stale)
}
