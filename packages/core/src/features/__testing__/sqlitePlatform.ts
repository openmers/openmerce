// Tests only: builds the parts of `Platform` these features use on real SQLite.
// The app adapter is `apps/api/src/platform/node/`; the goal here is that tests do not mock the driver.
// Ports (storage/cache/…) are not fakes but minimal in-memory equivalents; job consumer tests
// require the real `Platform` type.
import * as schema from "@openmers/db"
import type Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import type { AtomicStatement, BatchRows, Platform } from "../../platform"
import { memoryStorage } from "../media/storage/drivers/memory"

export function sqlitePlatform(conn: Database.Database): Platform & {
  batchCalls(): number
  storage: ReturnType<typeof memoryStorage>
} {
  let batchCalls = 0
  const db = drizzle(conn, { schema })
  const entries = new Map<string, unknown>()
  return {
    db,
    readDb: db,
    async atomic(stmts: readonly AtomicStatement[]): Promise<number[]> {
      return conn.transaction(() =>
        stmts.map((s) => conn.prepare(s.sql).run(...s.params).changes),
      )()
    },
    async batch(queries: readonly AtomicStatement[]): Promise<BatchRows[]> {
      batchCalls += 1
      return queries.map((q) => conn.prepare(q.sql).all(...q.params) as BatchRows)
    },
    storage: memoryStorage(),
    cache: {
      get: async <T>(key: string) => entries.get(key) as T | undefined,
      set: async <T>(key: string, value: T) => {
        entries.set(key, value)
      },
      delete: async (key: string) => {
        entries.delete(key)
      },
    },
    purge: async () => undefined,
    enqueue: async () => undefined,
    rateLimit: async () => ({ ok: true }),
    secrets: {},
    /** How many times `p.batch` was called (single round trip assertion). */
    batchCalls: () => batchCalls,
  }
}
