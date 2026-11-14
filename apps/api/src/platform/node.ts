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
  /** Write + read-only connection pair (`openNodeSqlite`); whoever opens it closes it (`close`). */
  sqlite: NodeSqlite
  /** Without a KEK the vault is dormant (item 11). */
  kek?: string
  /** Clock is injected (can be faked in tests). */
  now?: () => number
  cacheMax?: number
  rateLimit?: { limit: number; windowMs: number }
  /** Selected at startup (`storageFromEnv`: local disk or S3-compatible); tests pass the memory driver. */
  storage?: Storage
}

export type NodePlatform = Platform & { close(): void }

const CACHE_TTL_SECONDS = 60

/** No storage configured: an explicit error instead of silently swallowing writes. */
function missingStorage(): Storage {
  const fail = (): never => {
    throw new Error("no storage driver configured")
  }
  const failAsync = async (): Promise<never> => fail()
  return {
    put: failAsync,
    get: failAsync,
    delete: failAsync,
    head: failAsync,
    url: fail,
    signedUrl: failAsync,
  }
}

/**
 * Assembles the Node (self-host) `Platform` (`01-platform-arayuzu` §9): sqlite + atomic + batch,
 * LRU cache, in-memory rate limiting. `purge` and `enqueue` are no-ops; the outbox table is the source of truth.
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

  // shortcut: outbox item 9 — even if the nudge is lost, the poller processes the job (04-olaylar-isler-outbox).
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
