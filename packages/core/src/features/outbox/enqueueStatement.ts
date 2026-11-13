import { outbox } from "@openmers/db"
import type { SQL } from "drizzle-orm"
import { type AtomicStatement, type Db, guardedInsertStatement } from "../../platform"
import { newPublicId } from "../ids/publicId"
import { type OutboxJobInput, priorityFor } from "./types"

/** Values of the outbox row; `enqueueStatement` and the conditional write use the same mapping. */
export function outboxValues(job: OutboxJobInput, now: number): typeof outbox.$inferInsert {
  return {
    publicId: job.publicId ?? newPublicId("evt_"),
    kind: job.kind,
    event: job.event,
    payload: job.payload,
    appInstallationId: job.appInstallationId,
    status: "pending",
    attempts: 0,
    priority: job.priority ?? priorityFor(job.kind),
    nextAttemptAt: job.availableAt ?? now,
    dedupeKey: job.dedupeKey,
    requestId: job.requestId,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * An `INSERT outbox` statement to be added to another `atomic()`; it does not write on its own.
 * If `dedupeKey` is set, `ON CONFLICT DO NOTHING` is used: a pending identical job is not added again
 * (partial unique index `outbox_dedupe_uq`).
 *
 * If `when` is given the write is conditional (see `auditStatement`): if the condition fails, no job row is written.
 */
export function enqueueStatement(
  db: Db,
  job: OutboxJobInput,
  now: number,
  when?: SQL,
): AtomicStatement {
  const values = outboxValues(job, now)
  if (when) {
    const stmt = guardedInsertStatement(outbox, values, when)
    return job.dedupeKey ? { ...stmt, sql: `${stmt.sql} on conflict do nothing` } : stmt
  }
  const insert = db.insert(outbox).values(values)
  return (job.dedupeKey ? insert.onConflictDoNothing() : insert).toSQL()
}
