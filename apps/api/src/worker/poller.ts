import {
  type JobHandlers,
  MAINTENANCE_PERIOD_MS,
  type OutboxRunCounters,
  type PaymentRegistry,
  type Platform,
  runMaintenanceOnce,
  runOutboxOnce,
} from "@openmers/core"

// Self-host job consumer (roadmap 9.12): periodic ticks + 5 min maintenance. The queue is only a
// trigger; the source of truth is the `outbox` table (04-olaylar-isler-outbox).

/** Scheduler port; tests use a fake implementation and do not wait for the real clock. */
export type Scheduler = {
  /** The callback starts the next tick; the returned promise is the end of the tick. */
  set(callback: () => void | Promise<void>, ms: number): unknown
  clear(handle: unknown): void
}

export const systemScheduler: Scheduler = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export type PollerOptions = {
  platform: Platform
  handlers: JobHandlers
  /** Wait between ticks (default 1 s). */
  intervalMs?: number
  /** Maintenance interval (default 5 min). */
  maintenanceEveryMs?: number
  /** Rows per tick (default 20). */
  limit?: number
  now?: () => number
  scheduler?: Scheduler
  /** Installed payment methods; enables the checkout sweep and reconciliation in maintenance. */
  payments?: (now: number) => Promise<Pick<PaymentRegistry, "all">>
  /** A tick error does not crash the process; it is reported and the next tick is awaited. */
  onError?: (error: unknown) => void
}

export type Poller = {
  /** A single tick: job batch, plus maintenance if due. Does not install the timer (called directly in tests). */
  tick(): Promise<OutboxRunCounters>
  start(): void
  /** Waits for the running tick, then returns (SIGTERM: no half-processed batch is left). */
  stop(): Promise<void>
  isRunning(): boolean
}

/**
 * Single-flight rule: no new tick is scheduled before the current one ends, so a slow tick does not bloat the queue.
 * `stop()` clears the flag, cancels the timer and waits for the running tick.
 */
export function createPoller(opts: PollerOptions): Poller {
  const now = opts.now ?? Date.now
  const intervalMs = opts.intervalMs ?? 1_000
  const maintenanceEveryMs = opts.maintenanceEveryMs ?? MAINTENANCE_PERIOD_MS
  const limit = opts.limit ?? 20
  const scheduler = opts.scheduler ?? systemScheduler

  let handle: unknown
  let running = false
  let stopped = false
  let inflight: Promise<unknown> | undefined
  let lastMaintenanceAt: number | undefined

  async function round(): Promise<OutboxRunCounters> {
    const at = now()
    const counters = await runOutboxOnce(opts.platform, opts.handlers, { now: at, limit })
    if (lastMaintenanceAt === undefined || at - lastMaintenanceAt >= maintenanceEveryMs) {
      lastMaintenanceAt = at
      await runMaintenanceOnce(opts.platform, { now: at, payments: await opts.payments?.(at) })
    }
    return counters
  }

  function schedule(): void {
    if (stopped) return
    handle = scheduler.set(async () => {
      await advance()
    }, intervalMs)
  }

  function advance(): Promise<unknown> {
    const current = round().catch((error: unknown) => {
      opts.onError?.(error)
    })
    inflight = current.finally(() => {
      inflight = undefined
      schedule()
    })
    return inflight
  }

  return {
    tick: round,
    start() {
      if (running) return
      running = true
      stopped = false
      // The first tick also comes from the scheduler: startup does not wait, and tests tick from a single place.
      schedule()
    },
    async stop() {
      running = false
      stopped = true
      if (handle !== undefined) scheduler.clear(handle)
      handle = undefined
      await inflight
    },
    isRunning() {
      return running
    },
  }
}
