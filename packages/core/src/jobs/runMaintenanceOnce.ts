import { reconcileJob, sweepExpired } from "../features/checkout"
import { purgeExpired } from "../features/idempotency"
import { sweepCartUploads, sweepPending } from "../features/media"
import { purgeSent, requeueStuck } from "../features/outbox"
import { OUTBOX_LIMITS, type OutboxLimits } from "../features/outbox/types"
import type { PaymentRegistry } from "../features/payments"
import { claimRun } from "../features/scheduled"
import { finishRun } from "../features/scheduled/queries/finishRun"
import type { Platform } from "../platform"

/** 04-olaylar-isler-outbox "5 min sweep": the period key is also 5 minutes. */
export const MAINTENANCE_PERIOD_MS = 300_000

export const MAINTENANCE_TASKS = {
  requeueStuck: "outbox.requeue_stuck",
  purgeSent: "outbox.purge_sent",
  purgeIdempotency: "idempotency.purge_expired",
  sweepPendingMedia: "media.sweep_pending",
  sweepCartUploads: "media.sweep_cart_uploads",
} as const

/** Checkout jobs (05-sepet §4, §6); they run only when a payment registry is given. */
export const CHECKOUT_TASKS = {
  sweepExpired: "checkout.sweep_expired",
  reconcile: "checkout.reconcile",
} as const

export type MaintenanceTaskResult = {
  /** `false` = the period was already claimed by another trigger; the job did not run. */
  ran: boolean
  affected: number
  error?: string
}

export type MaintenanceResult = {
  period: number
  tasks: Record<keyof typeof MAINTENANCE_TASKS, MaintenanceTaskResult> &
    Partial<Record<keyof typeof CHECKOUT_TASKS, MaintenanceTaskResult>>
}

export type RunMaintenanceOnceInput = {
  now: number
  periodMs?: number
  limits?: OutboxLimits
  /** Installed payment methods; enables the manual-method sweep and reconciliation. */
  payments?: Pick<PaymentRegistry, "all">
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Sweep jobs: requeue stuck `sending` rows, delete old `sent` rows, delete expired
 * idempotency keys, stale uploads and abandoned cart images; with a payment registry also the manual-method checkout sweep and
 * reconciliation. Each job runs **once per period** via `claimRun`; even if two
 * consumers trigger at the same time only one takes the row. One job's failure does not stop the others.
 */
export async function runMaintenanceOnce(
  platform: Platform,
  input: RunMaintenanceOnceInput,
): Promise<MaintenanceResult> {
  const periodMs = input.periodMs ?? MAINTENANCE_PERIOD_MS
  const period = Math.floor(input.now / periodMs) * periodMs
  const limits = input.limits ?? OUTBOX_LIMITS

  const run = async (task: string, work: () => Promise<number>): Promise<MaintenanceTaskResult> => {
    const claimed = await claimRun(platform, { task, period, now: input.now })
    if (!claimed) return { ran: false, affected: 0 }
    try {
      const affected = await work()
      await finishRun(platform, { task, period, now: input.now, status: "done" })
      return { ran: true, affected }
    } catch (error) {
      const message = describeError(error)
      await finishRun(platform, {
        task,
        period,
        now: input.now,
        status: "failed",
        error: message,
      })
      return { ran: true, affected: 0, error: message }
    }
  }

  const requeue = await run(MAINTENANCE_TASKS.requeueStuck, () =>
    requeueStuck(platform, { now: input.now, limits }),
  )
  const sent = await run(MAINTENANCE_TASKS.purgeSent, () =>
    purgeSent(platform, { now: input.now, limits }),
  )
  const idempotency = await run(MAINTENANCE_TASKS.purgeIdempotency, () =>
    purgeExpired(platform, input.now),
  )

  const media = { platform, now: input.now }
  const tasks: MaintenanceResult["tasks"] = {
    requeueStuck: requeue,
    purgeSent: sent,
    purgeIdempotency: idempotency,
    sweepPendingMedia: await run(MAINTENANCE_TASKS.sweepPendingMedia, () => sweepPending(media)),
    sweepCartUploads: await run(MAINTENANCE_TASKS.sweepCartUploads, () => sweepCartUploads(media)),
  }
  const { payments } = input
  if (payments) {
    const ctx = { platform, now: input.now }
    const manual = payments
      .all()
      .filter((m) => m.handler.kind === "manual" && !m.handler.settleOnConfirm)
      .map((m) => m.id)
    tasks.sweepExpired = await run(CHECKOUT_TASKS.sweepExpired, () =>
      sweepExpired(ctx, { methodIds: manual }),
    )
    tasks.reconcile = await run(CHECKOUT_TASKS.reconcile, async () => {
      const r = await reconcileJob(ctx, { payments })
      return r.changed + r.refunds
    })
  }
  return { period, tasks }
}
