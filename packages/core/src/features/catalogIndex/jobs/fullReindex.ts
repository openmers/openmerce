import { products } from "@openmers/db"
import { asc, gt } from "drizzle-orm"
import type { JobHandler } from "../../../jobs/types"
import type { Platform } from "../../../platform"
import { enqueueStatement } from "../../outbox"
import { reindexProduct } from "./reindexProduct"

export const FULL_REINDEX_EVENT = "catalog.full_reindex"
export const FULL_REINDEX_CHUNK = 100

export type FullReindexInput = { cursor?: number; limit?: number }

/**
 * 15.8: one chunk of the full reindex in `products.id` order (deleted products included, so their rows are
 * removed). Returns the cursor to continue from, `null` when done. Each product is rewritten on its own,
 * so an interrupted chunk is safely repeated from the same cursor.
 */
export async function fullReindexChunk(
  platform: Platform,
  input: FullReindexInput = {},
): Promise<{ processed: number; nextCursor: number | null }> {
  const limit = Math.min(Math.max(1, input.limit ?? FULL_REINDEX_CHUNK), 1000)
  const rows = await platform.db
    .select({ id: products.id, publicId: products.publicId })
    .from(products)
    .where(gt(products.id, input.cursor ?? 0))
    .orderBy(asc(products.id))
    .limit(limit)
  for (const row of rows) await reindexProduct(platform, row.publicId)
  const last = rows.at(-1)
  return { processed: rows.length, nextCursor: rows.length === limit && last ? last.id : null }
}

/** Outbox job of the next chunk; the cursor is in the payload, the key merges a duplicate start. */
export function fullReindexJob(platform: Platform, cursor: number, now: number) {
  return enqueueStatement(
    platform.db,
    {
      kind: "reindex",
      event: FULL_REINDEX_EVENT,
      payload: { cursor },
      dedupeKey: `catalog:full:${cursor}`,
    },
    now,
  )
}

/** Admin start: enqueue the first chunk. */
export async function startFullReindex(platform: Platform, now: number): Promise<void> {
  await platform.atomic([fullReindexJob(platform, 0, now)])
}

/**
 * Runs one chunk and chains the next as a new outbox row. If the job dies before it is marked sent, it is
 * retried from the same cursor (each product write is idempotent).
 */
export const fullReindexHandler: JobHandler = async (job, { platform, now }) => {
  const cursor = Number(job.payload.cursor ?? 0)
  if (!Number.isSafeInteger(cursor) || cursor < 0) throw new Error("INVALID_PAYLOAD: cursor")
  const { nextCursor } = await fullReindexChunk(platform, { cursor })
  if (nextCursor !== null) await platform.atomic([fullReindexJob(platform, nextCursor, now)])
}
