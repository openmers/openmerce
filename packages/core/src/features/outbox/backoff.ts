import { OUTBOX_LIMITS, type OutboxLimits } from "./types"

/**
 * Saf: `attempts`. denemeden sonraki bekleme. Katalog 01: `min(2^attempts × 30 sn, 1 sa)`.
 * `attempts` bu hatadan sonraki toplam deneme sayısıdır (1 → 60 sn).
 */
export function nextAttemptDelay(
  attempts: number,
  limits: Pick<OutboxLimits, "baseBackoffMs" | "maxBackoffMs"> = OUTBOX_LIMITS,
): number {
  if (attempts < 1) throw new RangeError(`attempts en az 1 olmalı, gelen: ${attempts}`)
  const delay = limits.baseBackoffMs * 2 ** attempts
  return Math.min(delay, limits.maxBackoffMs)
}

/** Yeni deneme sayısı sınıra ulaştıysa satır `dead` olur (karar 8). */
export function isDead(
  attempts: number,
  limits: Pick<OutboxLimits, "maxAttempts"> = OUTBOX_LIMITS,
): boolean {
  return attempts >= limits.maxAttempts
}
