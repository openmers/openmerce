import { outbox } from "@openmers/db"
import { and, eq, sql } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"
import { nextAttemptDelay } from "../backoff"
import { OUTBOX_LIMITS, type OutboxLimits } from "../types"

export type MarkFailedInput = {
  id: number
  error: string
  now: number
  limits?: OutboxLimits
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
 * Deneme +1, üstel geri çekilme `next_attempt_at`; sınıra ulaşınca `dead` (karar 8).
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

/** `true` = satır bu çağrıda `failed`/`dead` oldu. */
export async function markFailed(
  p: Pick<Platform, "db" | "atomic">,
  input: MarkFailedInput,
): Promise<boolean> {
  const [n = 0] = await p.atomic([markFailedStatement(p.db, input)])
  return n > 0
}
