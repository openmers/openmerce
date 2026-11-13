import {
  type JobHandlers,
  MAINTENANCE_PERIOD_MS,
  type OutboxRunCounters,
  type Platform,
  runMaintenanceOnce,
  runOutboxOnce,
} from "@openmers/core"

// Self-host iş tüketicisi (yol haritası 9.12): aralıklı tur + 5 dk bakım. Kuyruk yalnız
// tetikleyicidir; doğruluk kaynağı `outbox` tablosudur (04-olaylar-isler-outbox).

/** Zamanlayıcı portu; test sahte bir uygulamayla gerçek saati beklemez. */
export type Scheduler = {
  /** Geri çağrı bir sonraki turu başlatır; dönen söz turun bitişidir. */
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
  /** Turlar arası bekleme (varsayılan 1 sn). */
  intervalMs?: number
  /** Bakım aralığı (varsayılan 5 dk). */
  maintenanceEveryMs?: number
  /** Tur başına satır (varsayılan 20). */
  limit?: number
  now?: () => number
  scheduler?: Scheduler
  /** Tur hatası süreci düşürmez; raporlanır ve sonraki tur beklenir. */
  onError?: (error: unknown) => void
}

export type Poller = {
  /** Tek tur: iş partisi, zamanı geldiyse bakım. Zamanlayıcıyı kurmaz (testte doğrudan çağrılır). */
  tick(): Promise<OutboxRunCounters>
  start(): void
  /** Süren turu bekler, sonra döner (SIGTERM: yarım parti bırakılmaz). */
  stop(): Promise<void>
  isRunning(): boolean
}

/**
 * Tek uçuş kuralı: tur bitmeden yenisi kurulmaz, bu yüzden yavaş bir tur kuyruğu şişirmez.
 * `stop()` bayrağı kaldırır, zamanlayıcıyı iptal eder ve süren turu bekler.
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
      await runMaintenanceOnce(opts.platform, { now: at })
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
      // İlk tur da zamanlayıcıdan gelir: açılış yolu beklemez, test tek noktadan tur atar.
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
