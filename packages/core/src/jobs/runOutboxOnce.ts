import { outbox } from "@openmers/db"
import { and, eq, inArray } from "drizzle-orm"
import { claimBatch, isDead, markFailed, markSent } from "../features/outbox"
import { OUTBOX_LIMITS, type OutboxLimits } from "../features/outbox/types"
import type { Db, Platform } from "../platform"
import { handlerFor, topicOf } from "./registry"
import type { JobHandlers, OutboxJob, OutboxRunCounters } from "./types"

/** Longest text written to the `last_error` column; provider errors may carry bodies. */
const MAX_ERROR_LENGTH = 500

export type RunOutboxOnceInput = {
  now: number
  /** Rows per tick (default 20). */
  limit?: number
  limits?: OutboxLimits
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.length > MAX_ERROR_LENGTH ? message.slice(0, MAX_ERROR_LENGTH) : message
}

/** Fetches the claimed rows in a single read; the order is `claimBatch`'s priority order. */
async function loadClaimed(db: Db, ids: readonly number[]): Promise<OutboxJob[]> {
  const rows = await db
    .select({
      id: outbox.id,
      publicId: outbox.publicId,
      kind: outbox.kind,
      event: outbox.event,
      payload: outbox.payload,
      attempts: outbox.attempts,
    })
    .from(outbox)
    .where(and(inArray(outbox.id, [...ids]), eq(outbox.status, "sending")))

  const byId = new Map(rows.map((row) => [Number(row.id), row]))
  return ids.flatMap((id) => {
    const row = byId.get(id)
    if (!row) return []
    return [
      {
        id: Number(row.id),
        publicId: row.publicId,
        kind: row.kind,
        topic: topicOf(row),
        payload: row.payload ?? {},
        attempts: row.attempts,
      },
    ]
  })
}

/**
 * One tick: `claimBatch` → handler for each job → `markSent` / `markFailed`.
 * One job's failure does not stop the others (each row is independent with its own attempts); an unregistered topic
 * becomes `failed` and falls to `dead` at the attempt limit.
 */
export async function runOutboxOnce(
  platform: Platform,
  handlers: JobHandlers,
  input: RunOutboxOnceInput,
): Promise<OutboxRunCounters> {
  const limits = input.limits ?? OUTBOX_LIMITS
  const counters: OutboxRunCounters = { claimed: 0, sent: 0, failed: 0, dead: 0 }

  const ids = await claimBatch(platform, { now: input.now, limit: input.limit ?? 20 })
  counters.claimed = ids.length
  if (ids.length === 0) return counters

  const jobs = await loadClaimed(platform.db, ids)
  for (const job of jobs) {
    const handler = handlerFor(handlers, job.topic)
    let error: string | undefined
    if (!handler) {
      error = `UNKNOWN_TOPIC: ${job.topic}`
    } else {
      try {
        await handler(job, { platform, now: input.now })
      } catch (caught) {
        error = describeError(caught)
      }
    }

    if (error === undefined) {
      if (await markSent(platform, job.id, input.now)) counters.sent += 1
      continue
    }

    await markFailed(platform, { id: job.id, error, now: input.now, topic: job.topic, limits })
    if (isDead(job.attempts + 1, limits)) counters.dead += 1
    else counters.failed += 1
  }

  return counters
}
