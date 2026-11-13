import { outbox } from "@openmers/db"
import type { SQL } from "drizzle-orm"
import { type AtomicStatement, type Db, guardedInsertStatement } from "../../platform"
import { newPublicId } from "../ids/publicId"
import { type OutboxJobInput, priorityFor } from "./types"

/** Outbox satırının değerleri; `enqueueStatement` ve koşullu yazım aynı eşlemeyi kullanır. */
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
 * Başka bir `atomic()`'e eklenecek `INSERT outbox` ifadesi; kendi başına yazmaz.
 * `dedupeKey` doluysa `ON CONFLICT DO NOTHING` kullanılır: bekleyen aynı iş yenisi eklenmez
 * (kısmi benzersiz indeks `outbox_dedupe_uq`).
 *
 * `when` verilirse yazım koşulludur (bkz. `auditStatement`): koşul tutmazsa iş satırı yazılmaz.
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
