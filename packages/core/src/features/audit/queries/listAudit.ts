import { auditLog } from "@openmers/db"
import { and, desc, eq, gte, lt, lte, type SQL } from "drizzle-orm"
import type { Db } from "../../../platform"
import type { AuditActorType } from "../types"

export type ListAuditInput = {
  limit?: number
  /** The last `seq` value of the previous page; the cursor (descending order). */
  cursor?: number
  actorType?: AuditActorType
  actorId?: number
  entityType?: string
  entityPublicId?: string
  action?: string
  /** `created_at` range, epoch ms. */
  from?: number
  to?: number
}

export type AuditListItem = {
  seq: number
  publicId: string
  actorType: AuditActorType
  actorId: number | null
  action: string
  entityType: string | null
  entityPublicId: string | null
  channelId: number | null
  before: unknown
  after: unknown
  requestId: string | null
  createdAt: number
  rowHash: string | null
}

/** `audit:read` list: `seq` descending, cursor-paginated; `(seq)` PK scan. */
export async function listAudit(
  db: Db,
  input: ListAuditInput = {},
): Promise<{ items: AuditListItem[]; nextCursor: number | null }> {
  const limit = Math.max(1, input.limit ?? 50)
  const filters: SQL[] = []
  if (input.cursor !== undefined) filters.push(lt(auditLog.seq, input.cursor))
  if (input.actorType !== undefined) filters.push(eq(auditLog.actorType, input.actorType))
  if (input.actorId !== undefined) filters.push(eq(auditLog.actorId, input.actorId))
  if (input.entityType !== undefined) filters.push(eq(auditLog.entityType, input.entityType))
  if (input.entityPublicId !== undefined) {
    filters.push(eq(auditLog.entityPublicId, input.entityPublicId))
  }
  if (input.action !== undefined) filters.push(eq(auditLog.action, input.action))
  if (input.from !== undefined) filters.push(gte(auditLog.createdAt, input.from))
  if (input.to !== undefined) filters.push(lte(auditLog.createdAt, input.to))

  const rows = await db
    .select({
      seq: auditLog.seq,
      publicId: auditLog.publicId,
      actorType: auditLog.actorType,
      actorId: auditLog.actorId,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityPublicId: auditLog.entityPublicId,
      channelId: auditLog.channelId,
      before: auditLog.before,
      after: auditLog.after,
      requestId: auditLog.requestId,
      createdAt: auditLog.createdAt,
      rowHash: auditLog.rowHash,
    })
    .from(auditLog)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(auditLog.seq))
    .limit(limit + 1)

  const items = rows.slice(0, limit)
  return { items, nextCursor: rows.length > limit ? (items.at(-1)?.seq ?? null) : null }
}
