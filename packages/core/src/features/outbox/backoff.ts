import { OUTBOX_LIMITS, type OutboxLimits } from "./types"

/**
 * Pure: the wait after attempt number `attempts`. Catalog 01: `min(2^attempts × 30 s, 1 h)`.
 * `attempts` is the total number of attempts after this error (1 → 60 s).
 */
export function nextAttemptDelay(
  attempts: number,
  limits: Pick<OutboxLimits, "baseBackoffMs" | "maxBackoffMs"> = OUTBOX_LIMITS,
): number {
  if (attempts < 1) throw new RangeError(`attempts en az 1 olmalı, gelen: ${attempts}`)
  const delay = limits.baseBackoffMs * 2 ** attempts
  return Math.min(delay, limits.maxBackoffMs)
}

/** If the new attempt count reaches the limit, the row becomes `dead` (decision 8). */
export function isDead(
  attempts: number,
  limits: Pick<OutboxLimits, "maxAttempts"> = OUTBOX_LIMITS,
): boolean {
  return attempts >= limits.maxAttempts
}
