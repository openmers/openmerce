import type { outboxKinds } from "@openmers/db"

export type OutboxKind = (typeof outboxKinds)[number]

/** 00-genel karar 8 ve katalog 01 `settings` maddesi; değerler `settings` ile değiştirilebilir. */
export type OutboxLimits = {
  /** Bu sayıya ulaşan deneme satırı `dead` olur (varsayılan 10). */
  maxAttempts: number
  /** İlk hatanın taban beklemesi (varsayılan 30 sn). */
  baseBackoffMs: number
  /** Üstel geri çekilmenin üst sınırı (varsayılan 1 sa). */
  maxBackoffMs: number
  /** Bu süreden uzun `sending` satır geri alınır (varsayılan 5 dk). */
  claimTimeoutMs: number
  /** `sent` satırın yaşı (varsayılan 7 gün). */
  sentRetentionMs: number
}

export const OUTBOX_LIMITS: OutboxLimits = {
  maxAttempts: 10,
  baseBackoffMs: 30_000,
  maxBackoffMs: 3_600_000,
  claimTimeoutMs: 300_000,
  sentRetentionMs: 604_800_000,
}

// Katalog 01 `outbox` "priority" kararı: küçük önce.
const PRIORITY: Record<OutboxKind, number> = {
  notify: 0,
  webhook: 0,
  event: 1,
  invoice: 1,
  fulfillment: 1,
  scheduled: 1,
  collection: 2,
  reindex: 3,
  import: 3,
}

export function priorityFor(kind: OutboxKind): number {
  return PRIORITY[kind]
}

/** Komutun `atomic()`'ine eklenecek iş/olay satırı; `publicId` çağırandan gelir (ids, madde 6.6). */
export type OutboxJobInput = {
  publicId: string
  kind: OutboxKind
  payload: Record<string, unknown>
  event?: string
  appInstallationId?: number
  priority?: number
  /** `reindex` birleştirmesi; doluysa bekleyen aynı anahtar yeni satır üretmez. */
  dedupeKey?: string
  requestId?: string
  /** Varsayılan `now`; ileri tarihli iş için. */
  availableAt?: number
}
