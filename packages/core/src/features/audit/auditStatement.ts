import { auditLog } from "@openmers/db"
import type { SQL } from "drizzle-orm"
import { type AtomicStatement, type Db, guardedInsertStatement } from "../../platform"
import { newAuditPublicId } from "./publicId"
import type { AuditEntry } from "./types"

/** Denetim satırının değerleri; `auditStatement` ve koşullu yazım aynı eşlemeyi kullanır. */
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
 * Başka bir `atomic()`'e eklenecek `INSERT audit_log` ifadesi; kendi başına yazmaz.
 * Değişiklik yazıldıysa denetim satırı da vardır (06-güvenlik "Denetim kaydı").
 *
 * `when` verilirse yazım koşulludur: koşul tutmayan (ör. `version` çakışması) güncellemenin denetim
 * satırı da yazılmaz. `prev_hash`/`row_hash` burada yazılmaz: katalog 01 `audit_log` zinciri
 * **mühürleme işiyle** kurulur (tek tüketici, `seq` sırası), çünkü D1'de eşzamanlı yazma sırası
 * garanti değildir.
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
