import { type SQL, sql } from "drizzle-orm"
import { sqlStatement } from "../../../platform"
import { notUsed, objectKeys } from "../delete/deleteMedia"
import type { MediaCtx } from "../types"

export const SWEEP_LIMIT = 100

/**
 * Deletes candidate rows, each re-checked by `guard` + "not used" in its own statement, then the
 * objects of the rows actually deleted. Row first: a failed object delete leaves an orphan file,
 * never a row pointing at nothing. Returns the number of rows removed.
 */
export async function removeRows(
  ctx: MediaCtx,
  rows: Record<string, unknown>[],
  guard: SQL,
): Promise<number> {
  if (rows.length === 0) return 0
  const p = ctx.platform
  const result = await p.atomic(
    rows.map((r) =>
      sqlStatement(
        sql`DELETE FROM "media" WHERE "id" = ${Number(r.id)} AND ${guard} AND ${notUsed}`,
      ),
    ),
  )
  const gone = rows.filter((_, i) => (result[i] ?? 0) > 0)
  await Promise.allSettled(
    gone.flatMap((r) => objectKeys(String(r.key), r.sizes)).map((k) => p.storage.delete(k)),
  )
  return gone.length
}
