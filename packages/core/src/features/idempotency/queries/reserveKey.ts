import { idempotencyKeys } from "@openmers/db"
import { and, eq, lte } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"
import { IDEMPOTENCY_TTL_MS, type IdempotencyActorType } from "../types"

export type ReserveKeyInput = {
  actorType: IdempotencyActorType
  /** Anonimde 0 (şema varsayılanı). */
  actorId?: number
  key: string
  /** Gövde + rota özeti; aynı anahtarla farklı gövde çağıranda 422'ye eşlenir. */
  requestHash: string
  ttlMs?: number
}

/** İlk istek: `in_progress` sahiplenir. Anahtar varsa 0 satır döner. */
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

/** Süresi dolmuş satırı aynı anahtar/adresle yeniden sahiplenir (süpürme beklemeden). */
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
 * `true` = anahtar bu çağrıda sahiplenildi (yeni ya da süresi dolmuş satırın yeniden kullanımı).
 * `false` = başka bir istek `in_progress`/`done` olarak tutuyor.
 * Koşullu: her iki ifade de tek `atomic()` içinde, kararı yazma verir.
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
