import { idempotencyKeys } from "@openmers/db"
import { and, eq } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"
import type { IdempotencyActorType } from "../types"

export type SaveResponseInput = {
  actorType: IdempotencyActorType
  actorId?: number
  key: string
  responseStatus: number
  response: unknown
}

/** Response write added to the command's `atomic()`; only turns an `in_progress` row into `done`. */
export function saveResponseStatement(
  db: Db,
  input: SaveResponseInput,
  now: number,
): AtomicStatement {
  return db
    .update(idempotencyKeys)
    .set({
      status: "done",
      responseStatus: input.responseStatus,
      response: input.response,
      updatedAt: now,
    })
    .where(
      and(
        eq(idempotencyKeys.actorType, input.actorType),
        eq(idempotencyKeys.actorId, input.actorId ?? 0),
        eq(idempotencyKeys.key, input.key),
        eq(idempotencyKeys.status, "in_progress"),
      ),
    )
    .toSQL()
}

/** `true` = the response was written; `false` = the key is missing or already `done`. */
export async function saveResponse(
  p: Pick<Platform, "db" | "atomic">,
  input: SaveResponseInput,
  now: number,
): Promise<boolean> {
  const [n = 0] = await p.atomic([saveResponseStatement(p.db, input, now)])
  return n > 0
}
