import type { OutboxKind } from "../features/outbox"
import type { Platform } from "../platform"

/** The consumer-facing view of an outbox row; `payload` is small (ids + changed fields). */
export type OutboxJob = {
  id: number
  publicId: string
  kind: OutboxKind
  /** `event ?? kind`; the key of the handler registry. */
  topic: string
  payload: Record<string, unknown>
  /** Count before this attempt (markFailed writes +1). */
  attempts: number
}

export type JobContext = {
  platform: Platform
  /** The tick's clock; `Date.now()` is not called inside a job. */
  now: number
}

/** The function doing the work. If it throws, the row becomes `failed`; it must be idempotent. */
export type JobHandler = (job: OutboxJob, ctx: JobContext) => Promise<void> | void

/** `topic → handler`. An unregistered topic becomes `failed` (unknown jobs are not silently swallowed). */
export type JobHandlers = Readonly<Record<string, JobHandler>>

/** Counters of a tick. `dead` = rows that reached the attempt limit (10th attempt). */
export type OutboxRunCounters = {
  claimed: number
  sent: number
  failed: number
  dead: number
}
