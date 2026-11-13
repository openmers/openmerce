import type { idempotencyActorTypes, idempotencyKeys } from "@openmers/db"

export type IdempotencyActorType = (typeof idempotencyActorTypes)[number]

export type IdempotencyRecord = typeof idempotencyKeys.$inferSelect

/** `02-api-ve-istek-baglami` bölüm 3: anahtar + aktör sonucu 24 saat saklanır. */
export const IDEMPOTENCY_TTL_MS = 86_400_000
