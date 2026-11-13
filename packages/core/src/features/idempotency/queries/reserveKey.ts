import { idempotencyKeys } from "@openmers/db"
import { and, eq, lte } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"
import { IDEMPOTENCY_TTL_MS, type IdempotencyActorType } from "../types"

export type ReserveKeyInput = {
  actorType: IdempotencyActorType
  /** 0 for anonymous (schema default). */
  actorId?: number
  key: string
  /** Body + route hash; mapped to 422 when the same key is called with a different body. */
  requestHash: string
  ttlMs?: number
}

/** First request: claims `in_progress`. Returns 0 rows if the key exists. */
export function reserveInsertStatement(db: Db, input: ReserveKeyInput, now: number) {
  return db
    .insert(idempotencyKeys)
    .values({
      actorType: input.actorType,
      actorId: input.actorId ?? 0,
      key: input.key,
      requestHash: input.requestHash,
      status: "in_progress",
      expiresAt: now + (input.ttlMs ?? IDEMPOTENCY_TTL_MS),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .toSQL()
}

/** Reclaims an expired row with the same key/address (without waiting for the sweep). */
export function reserveReclaimStatement(
  db: Db,
  input: ReserveKeyInput,
  now: number,
): AtomicStatement {
  return db
    .update(idempotencyKeys)
    .set({
      requestHash: input.requestHash,
      status: "in_progress",
      responseStatus: null,
      response: null,
      expiresAt: now + (input.ttlMs ?? IDEMPOTENCY_TTL_MS),
      updatedAt: now,
    })
    .where(
      and(
        eq(idempotencyKeys.actorType, input.actorType),
        eq(idempotencyKeys.actorId, input.actorId ?? 0),
        eq(idempotencyKeys.key, input.key),
        lte(idempotencyKeys.expiresAt, now),
      ),
    )
    .toSQL()
}

/**
 * `true` = the key was claimed in this call (new, or reuse of an expired row).
 * `false` = another request holds it as `in_progress`/`done`.
 * Conditional: both statements are in one `atomic()`, the write makes the decision.
 */
export async function reserveKey(
  p: Pick<Platform, "db" | "atomic">,
  input: ReserveKeyInput,
  now: number,
): Promise<boolean> {
  const [inserted = 0, reclaimed = 0] = await p.atomic([
    reserveInsertStatement(p.db, input, now),
    reserveReclaimStatement(p.db, input, now),
  ])
  return inserted > 0 || reclaimed > 0
}
