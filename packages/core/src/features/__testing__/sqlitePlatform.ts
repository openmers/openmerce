// Yalnız testler: `Platform`'un bu feature'ların kullandığı üç parçasını gerçek SQLite üzerinde kurar.
// Uygulama adaptörü `apps/api/src/platform/node/`; burada amaç testin sürücüyü taklit etmemesi.
import * as schema from "@openmers/db"
import type Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import type { AtomicStatement, BatchRows } from "../../platform"

export function sqlitePlatform(conn: Database.Database) {
  let batchCalls = 0
  return {
    db: drizzle(conn, { schema }),
    async atomic(stmts: readonly AtomicStatement[]): Promise<number[]> {
      return conn.transaction(() =>
        stmts.map((s) => conn.prepare(s.sql).run(...s.params).changes),
      )()
    },
    async batch(queries: readonly AtomicStatement[]): Promise<BatchRows[]> {
      batchCalls += 1
      return queries.map((q) => conn.prepare(q.sql).all(...q.params) as BatchRows)
    },
    /** `p.batch` kaç kez çağrıldı (tek tur iddiası). */
    batchCalls: () => batchCalls,
  }
}
