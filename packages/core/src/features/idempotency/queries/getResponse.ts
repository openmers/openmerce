import { idempotencyKeys } from "@openmers/db"
import { and, eq, gt } from "drizzle-orm"
import type { Platform } from "../../../platform"
import type { IdempotencyActorType } from "../types"

export type GetResponseInput = {
  actorType: IdempotencyActorType
  actorId?: number
  key: string
}

export type StoredResponse = {
  status: "in_progress" | "done"
  requestHash: string
  responseStatus: number | null
  response: unknown
}

/** Süresi dolmuş satır yok sayılır; süpürme ayrıca siler. */
export async function getResponse(
  p: Pick<Platform, "db">,
  input: GetResponseInput,
  now: number,
): Promise<StoredResponse | null> {
  const rows = await p.db
    .select({
      status: idempotencyKeys.status,
      requestHash: idempotencyKeys.requestHash,
      responseStatus: idempotencyKeys.responseStatus,
      response: idempotencyKeys.response,
    })
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.actorType, input.actorType),
        eq(idempotencyKeys.actorId, input.actorId ?? 0),
        eq(idempotencyKeys.key, input.key),
        gt(idempotencyKeys.expiresAt, now),
      ),
    )
  return rows[0] ?? null
}
