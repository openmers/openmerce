import {
  type Cache,
  createFixedWindow,
  createLru,
  type Enqueue,
  type Platform,
  type Purge,
  type RateLimit,
  type Storage,
} from "@openmers/core"
import { nodeAtomic, nodeBatch } from "./node/atomic"
import type { NodeSqlite } from "./node/sqlite"

export type NodePlatformOptions = {
  /** Yazma + salt-okunur bağlantı çifti (`openNodeSqlite`); açan taraf kapatır (`close`). */
  sqlite: NodeSqlite
  /** KEK yoksa kasa uykuda (madde 11). */
  kek?: string
  /** Saat dışarıdan (testte sahtelenebilir). */
  now?: () => number
  cacheMax?: number
  rateLimit?: { limit: number; windowMs: number }
  /** Yerel disk / S3 adaptörü gelene kadar verilmez (madde 5.8). */
  storage?: Storage
}

export type NodePlatform = Platform & { close(): void }

const CACHE_TTL_SECONDS = 60

/** `storage` yer tutucusu: adaptör yokken sessizce yutmak yerine açık hata (madde 5.8). */
function missingStorage(): Storage {
  const fail = async (): Promise<never> => {
    throw new Error("storage adaptörü yok: yerel disk/S3 madde 5.8'de gelir")
  }
  return { put: fail, get: fail, delete: fail, head: fail }
}

/**
 * Node (self-host) `Platform`'u birleştirir (`01-platform-arayuzu` §9): sqlite + atomic + batch,
 * LRU cache, bellek hız sınırı. `purge` ve `enqueue` no-op'tur; doğruluk outbox tablosundadır.
 */
export function createNodePlatform(opts: NodePlatformOptions): NodePlatform {
  const { sqlite } = opts
  const now = opts.now ?? Date.now
  const entries = createLru<{ value: unknown }>({ max: opts.cacheMax ?? 10_000 })

  const cache: Cache = {
    async get<T>(key: string): Promise<T | undefined> {
      return entries.get(key, now())?.value as T | undefined
    },
    async set<T>(key: string, value: T, o?: { ttlSeconds?: number }): Promise<void> {
      const ttlMs = (o?.ttlSeconds ?? CACHE_TTL_SECONDS) * 1000
      entries.set(key, { value }, now(), ttlMs)
    },
    async delete(key: string): Promise<void> {
      entries.delete(key)
    },
  }

  const purge: Purge = async (_tags) => undefined

  // shortcut: outbox madde 9 — dürtme kaybolsa da iş poller'da işlenir (04-olaylar-isler-outbox).
  const enqueue: Enqueue = async (_job) => undefined

  const window = createFixedWindow({
    limit: opts.rateLimit?.limit ?? 60,
    windowMs: opts.rateLimit?.windowMs ?? 60_000,
  })
  const rateLimit: RateLimit = async (key) => window.hit(key, now())

  return {
    db: sqlite.db,
    readDb: sqlite.readDb,
    atomic: nodeAtomic(sqlite.write),
    batch: nodeBatch(sqlite.write),
    storage: opts.storage ?? missingStorage(),
    cache,
    purge,
    enqueue,
    rateLimit,
    secrets: { kek: opts.kek },
    close: sqlite.close,
  }
}
