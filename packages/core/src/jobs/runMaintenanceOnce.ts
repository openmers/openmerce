import { purgeExpired } from "../features/idempotency"
import { purgeSent, requeueStuck } from "../features/outbox"
import { OUTBOX_LIMITS, type OutboxLimits } from "../features/outbox/types"
import { claimRun } from "../features/scheduled"
import { finishRun } from "../features/scheduled/queries/finishRun"
import type { Platform } from "../platform"

/** 04-olaylar-isler-outbox "5 dk süpürme": dönem anahtarı da 5 dakikadır. */
export const MAINTENANCE_PERIOD_MS = 300_000

export const MAINTENANCE_TASKS = {
  requeueStuck: "outbox.requeue_stuck",
  purgeSent: "outbox.purge_sent",
  purgeIdempotency: "idempotency.purge_expired",
} as const

export type MaintenanceTaskResult = {
  /** `false` = dönem başka bir tetik tarafından sahiplenilmişti; iş çalışmadı. */
  ran: boolean
  affected: number
  error?: string
}

export type MaintenanceResult = {
  period: number
  tasks: Record<keyof typeof MAINTENANCE_TASKS, MaintenanceTaskResult>
}

export type RunMaintenanceOnceInput = {
  now: number
  periodMs?: number
  limits?: OutboxLimits
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Süpürme işleri: takılı `sending` satırları geri al, eski `sent` satırları sil, süresi dolan
 * idempotency anahtarlarını sil. Her iş `claimRun` ile **dönem başına bir kez** çalışır; iki
 * tüketici aynı anda tetiklese bile satırı yalnız biri alır. Bir işin hatası diğerlerini durdurmaz.
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

  return {
    period,
    tasks: { requeueStuck: requeue, purgeSent: sent, purgeIdempotency: idempotency },
  }
}
