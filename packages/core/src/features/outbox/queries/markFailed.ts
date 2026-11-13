import { outbox } from "@openmers/db"
import { and, eq, sql } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"
import { newPublicId } from "../../ids/publicId"
import { nextAttemptDelay } from "../backoff"
import { OUTBOX_LIMITS, type OutboxLimits, priorityFor } from "../types"

export type MarkFailedInput = {
  id: number
  error: string
  now: number
  /** Written into the notification body (`event ?? kind`). */
  topic?: string
  limits?: OutboxLimits
  /** Id of the notification row; generated if not given (can be fixed in tests). */
  notifyPublicId?: string
}

// `attempts` is read with its old value within the same UPDATE; that is why the delay is chosen in a single statement.
function delayCase(limits: OutboxLimits) {
  const parts = []
  for (let attempts = 1; attempts < limits.maxAttempts; attempts += 1) {
    parts.push(sql`WHEN ${attempts} THEN ${nextAttemptDelay(attempts, limits)}`)
  }
  return sql`(CASE ${outbox.attempts} + 1 ${sql.join(parts, sql` `)} ELSE ${nextAttemptDelay(
    limits.maxAttempts,
    limits,
  )} END)`
}

/**
 * Notification row to the store owner for a row about to become `dead` (catalog 01 `outbox` "notify the store
 * owner", roadmap 9.7). The condition is exactly the same as the precondition of the UPDATE below
 * (`sending` + last attempt), so it is written once, only for a row that actually becomes `dead`.
 * Drizzle cannot express a conditional `INSERT ... SELECT`, so the SQL is written by hand; table/column names
 * match `0005_events.sql`.
 */
export function deadNotificationStatement(input: MarkFailedInput): AtomicStatement {
  const limits = input.limits ?? OUTBOX_LIMITS
  const payload = JSON.stringify({
    outbox_id: input.id,
    topic: input.topic ?? null,
    attempts: limits.maxAttempts,
    error: input.error,
  })
  return {
    sql: `INSERT INTO outbox (public_id, kind, event, payload, status, attempts, priority, next_attempt_at, created_at, updated_at)
SELECT ?, 'notify', 'outbox.dead', ?, 'pending', 0, ?, ?, ?, ?
WHERE EXISTS (SELECT 1 FROM outbox WHERE id = ? AND status = 'sending' AND attempts = ?)`,
    params: [
      input.notifyPublicId ?? newPublicId("evt_"),
      payload,
      priorityFor("notify"),
      input.now,
      input.now,
      input.now,
      input.id,
      limits.maxAttempts - 1,
    ],
  }
}

/**
 * Attempts +1, exponential backoff `next_attempt_at`; on reaching the limit `dead` (decision 8) and a
 * notification row in the same `atomic()`.
 * Conditional: only a `sending` row; no other consumer can interleave.
 */
export function markFailedStatement(db: Db, input: MarkFailedInput): AtomicStatement {
  const limits = input.limits ?? OUTBOX_LIMITS
  const nextAttempts = sql`${outbox.attempts} + 1`
  const dead = sql`${nextAttempts} >= ${limits.maxAttempts}`
  return db
    .update(outbox)
    .set({
      attempts: nextAttempts,
      status: sql`CASE WHEN ${dead} THEN 'dead' ELSE 'failed' END`,
      lastError: input.error,
      nextAttemptAt: sql`CASE WHEN ${dead} THEN ${outbox.nextAttemptAt} ELSE ${
        input.now
      } + ${delayCase(limits)} END`,
      claimedAt: null,
      updatedAt: input.now,
    })
    .where(and(eq(outbox.id, input.id), eq(outbox.status, "sending")))
    .toSQL()
}

/**
 * `true` = the row became `failed`/`dead` in this call. The notification row is written first (its condition is the
 * UPDATE's precondition), then the row is marked `dead`/`failed`; both are one unit.
 */
export async function markFailed(
  p: Pick<Platform, "db" | "atomic">,
  input: MarkFailedInput,
): Promise<boolean> {
  const result = await p.atomic([
    deadNotificationStatement(input),
    markFailedStatement(p.db, input),
  ])
  return (result[1] ?? 0) > 0
}
