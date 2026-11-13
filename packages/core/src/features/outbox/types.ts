import type { outboxKinds } from "@openmers/db"

export type OutboxKind = (typeof outboxKinds)[number]

/** 00-genel decision 8 and the catalog 01 `settings` item; values can be changed via `settings`. */
export type OutboxLimits = {
  /** An attempted row reaching this count becomes `dead` (default 10). */
  maxAttempts: number
  /** Base wait after the first error (default 30 s). */
  baseBackoffMs: number
  /** Upper bound of the exponential backoff (default 1 h). */
  maxBackoffMs: number
  /** A `sending` row older than this is requeued (default 5 min). */
  claimTimeoutMs: number
  /** Age of a `sent` row (default 7 days). */
  sentRetentionMs: number
}

export const OUTBOX_LIMITS: OutboxLimits = {
  maxAttempts: 10,
  baseBackoffMs: 30_000,
  maxBackoffMs: 3_600_000,
  claimTimeoutMs: 300_000,
  sentRetentionMs: 604_800_000,
}

// Catalog 01 `outbox` "priority" decision: lower first.
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

/** Job/event row to be added to the command's `atomic()`; `evt_` is generated if `publicId` is not given (ids, item 6.6). */
export type OutboxJobInput = {
  publicId?: string
  kind: OutboxKind
  payload: Record<string, unknown>
  event?: string
  appInstallationId?: number
  priority?: number
  /** `reindex` merging; if set, a pending row with the same key does not produce a new row. */
  dedupeKey?: string
  requestId?: string
  /** Defaults to `now`; for jobs scheduled in the future. */
  availableAt?: number
}
