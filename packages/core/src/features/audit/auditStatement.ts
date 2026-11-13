import { auditLog } from "@openmers/db"
import type { SQL } from "drizzle-orm"
import { type AtomicStatement, type Db, guardedInsertStatement } from "../../platform"
import { newAuditPublicId } from "./publicId"
import type { AuditEntry } from "./types"

/** Values of the audit row; `auditStatement` and the conditional write use the same mapping. */
export function auditValues(entry: AuditEntry, now: number): typeof auditLog.$inferInsert {
  return {
    publicId: entry.publicId ?? newAuditPublicId(),
    actorType: entry.actor.type,
    actorId: entry.actor.id,
    viaAppInstallationId: entry.actor.viaAppInstallationId,
    onBehalfCustomerId: entry.actor.onBehalfCustomerId,
    action: entry.action,
    entityType: entry.entityType,
    entityPublicId: entry.entityPublicId,
    channelId: entry.channelId,
    before: entry.before,
    after: entry.after,
    requestId: entry.requestId,
    createdAt: now,
  }
}

/**
 * An `INSERT audit_log` statement to be added to another `atomic()`; it does not write on its own.
 * If a change was written, there is an audit row too (06-guvenlik-ve-yetki "Audit log").
 *
 * If `when` is given the write is conditional: an update whose condition fails (e.g. a `version` conflict)
 * writes no audit row either. `prev_hash`/`row_hash` are not written here: the catalog 01 `audit_log` chain
 * is built **by the sealing job** (single consumer, `seq` order), because concurrent write order
 * is not guaranteed on D1.
 */
export function auditStatement(
  db: Db,
  entry: AuditEntry,
  now: number,
  when?: SQL,
): AtomicStatement {
  const values = auditValues(entry, now)
  if (when) return guardedInsertStatement(auditLog, values, when)
  return db.insert(auditLog).values(values).toSQL()
}
