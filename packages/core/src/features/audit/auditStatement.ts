import { auditLog } from "@openmers/db"
import type { AtomicStatement, Db } from "../../platform"
import { newAuditPublicId } from "./publicId"
import type { AuditEntry } from "./types"

/**
 * Başka bir `atomic()`'e eklenecek `INSERT audit_log` ifadesi; kendi başına yazmaz.
 * Değişiklik yazıldıysa denetim satırı da vardır (06-güvenlik "Denetim kaydı").
 *
 * `prev_hash`/`row_hash` burada yazılmaz: katalog 01 `audit_log` zinciri **mühürleme işiyle**
 * kurar (tek tüketici, `seq` sırası), çünkü D1'de eşzamanlı yazma sırası garanti değildir.
 */
export function auditStatement(db: Db, entry: AuditEntry, now: number): AtomicStatement {
  return db
    .insert(auditLog)
    .values({
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
    })
    .toSQL()
}
