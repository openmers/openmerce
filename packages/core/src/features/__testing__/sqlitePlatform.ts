// Yalnız testler: `Platform`'un bu feature'ların kullandığı parçalarını gerçek SQLite üzerinde kurar.
// Uygulama adaptörü `apps/api/src/platform/node/`; burada amaç testin sürücüyü taklit etmemesi.
// Portlar (storage/cache/…) sahte değil, bellek içi en küçük karşılıklarıdır; iş tüketicisi testleri
// gerçek `Platform` tipini ister.
import * as schema from "@openmers/db"
import type Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import type { AtomicStatement, BatchRows, Platform } from "../../platform"

export function sqlitePlatform(conn: Database.Database): Platform & { batchCalls(): number } {
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
    storage: {
      put: async () => undefined,
      get: async () => null,
      delete: async () => undefined,
      head: async () => null,
    },
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
    /** `p.batch` kaç kez çağrıldı (tek tur iddiası). */
    batchCalls: () => batchCalls,
  }
}
