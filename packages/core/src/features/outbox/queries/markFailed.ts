import { outbox } from "@openmers/db"
import { and, eq, sql } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"
import { newPublicId } from "../../ids/publicId"
import { nextAttemptDelay } from "../backoff"
import { OUTBOX_LIMITS, type OutboxLimits, priorityFor } from "../types"

export type MarkFailedInput = {
  id: number
  error: string
  now: number
  /** Bildirim gövdesine yazılır (`event ?? kind`). */
  topic?: string
  limits?: OutboxLimits
  /** Bildirim satırının kimliği; verilmezse üretilir (testte sabitlenebilir). */
  notifyPublicId?: string
}

// `attempts` aynı UPDATE içinde eski değeriyle okunur; gecikme bu yüzden tek ifadede seçilir.
function delayCase(limits: OutboxLimits) {
  const parts = []
  for (let attempts = 1; attempts < limits.maxAttempts; attempts += 1) {
    parts.push(sql`WHEN ${attempts} THEN ${nextAttemptDelay(attempts, limits)}`)
  }
  return sql`(CASE ${outbox.attempts} + 1 ${sql.join(parts, sql` `)} ELSE ${nextAttemptDelay(
    limits.maxAttempts,
    limits,
  )} END)`
}

/**
 * `dead` olacak satır için mağaza sahibine bildirim satırı (katalog 01 `outbox` "mağaza sahibine
 * bildirim", yol haritası 9.7). Koşul, aşağıdaki UPDATE'in ön koşuluyla birebir aynıdır
 * (`sending` + son deneme), bu yüzden yalnız gerçekten `dead` olan satır için bir kez yazılır.
 * Drizzle koşullu `INSERT ... SELECT` ifade edemediği için SQL elle yazılır; tablo/kolon adları
 * `0005_events.sql` ile aynıdır.
 */
export function deadNotificationStatement(input: MarkFailedInput): AtomicStatement {
  const limits = input.limits ?? OUTBOX_LIMITS
  const payload = JSON.stringify({
    outbox_id: input.id,
    topic: input.topic ?? null,
    attempts: limits.maxAttempts,
    error: input.error,
  })
  return {
    sql: `INSERT INTO outbox (public_id, kind, event, payload, status, attempts, priority, next_attempt_at, created_at, updated_at)
SELECT ?, 'notify', 'outbox.dead', ?, 'pending', 0, ?, ?, ?, ?
WHERE EXISTS (SELECT 1 FROM outbox WHERE id = ? AND status = 'sending' AND attempts = ?)`,
    params: [
      input.notifyPublicId ?? newPublicId("evt_"),
      payload,
      priorityFor("notify"),
      input.now,
      input.now,
      input.now,
      input.id,
      limits.maxAttempts - 1,
    ],
  }
}

/**
 * Deneme +1, üstel geri çekilme `next_attempt_at`; sınıra ulaşınca `dead` (karar 8) ve aynı
 * `atomic()` içinde bildirim satırı.
 * Koşullu: yalnız `sending` satırı; başka bir tüketici araya giremez.
 */
export function markFailedStatement(db: Db, input: MarkFailedInput): AtomicStatement {
  const limits = input.limits ?? OUTBOX_LIMITS
  const nextAttempts = sql`${outbox.attempts} + 1`
  const dead = sql`${nextAttempts} >= ${limits.maxAttempts}`
  return db
    .update(outbox)
    .set({
      attempts: nextAttempts,
      status: sql`CASE WHEN ${dead} THEN 'dead' ELSE 'failed' END`,
      lastError: input.error,
      nextAttemptAt: sql`CASE WHEN ${dead} THEN ${outbox.nextAttemptAt} ELSE ${
        input.now
      } + ${delayCase(limits)} END`,
      claimedAt: null,
      updatedAt: input.now,
    })
    .where(and(eq(outbox.id, input.id), eq(outbox.status, "sending")))
    .toSQL()
}

/**
 * `true` = satır bu çağrıda `failed`/`dead` oldu. Bildirim satırı önce yazılır (koşulu UPDATE'in
 * ön koşulu), sonra satır `dead`/`failed` işaretlenir; ikisi tek birimdir.
 */
export async function markFailed(
  p: Pick<Platform, "db" | "atomic">,
  input: MarkFailedInput,
): Promise<boolean> {
  const result = await p.atomic([
    deadNotificationStatement(input),
    markFailedStatement(p.db, input),
  ])
  return (result[1] ?? 0) > 0
}
