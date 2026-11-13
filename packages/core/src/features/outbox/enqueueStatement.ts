import { outbox } from "@openmers/db"
import type { AtomicStatement, Db } from "../../platform"
import { type OutboxJobInput, priorityFor } from "./types"

/**
 * Başka bir `atomic()`'e eklenecek `INSERT outbox` ifadesi; kendi başına yazmaz.
 * `dedupeKey` doluysa `ON CONFLICT DO NOTHING` kullanılır: bekleyen aynı iş yenisi eklenmez
 * (kısmi benzersiz indeks `outbox_dedupe_uq`).
 */
export function enqueueStatement(db: Db, job: OutboxJobInput, now: number): AtomicStatement {
  const insert = db.insert(outbox).values({
    publicId: job.publicId,
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
  })
  return (job.dedupeKey ? insert.onConflictDoNothing() : insert).toSQL()
}
