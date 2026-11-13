import type { idempotencyActorTypes, idempotencyKeys } from "@openmers/db"

export type IdempotencyActorType = (typeof idempotencyActorTypes)[number]

export type IdempotencyRecord = typeof idempotencyKeys.$inferSelect

/** `02-api-ve-istek-baglami` section 3: the key + actor result is kept for 24 hours. */
export const IDEMPOTENCY_TTL_MS = 86_400_000
