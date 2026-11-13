import type Database from "better-sqlite3"
import { parseQueryPlan, type QueryPlanRow } from "./parseQueryPlan"

/** Drizzle `query.toSQL()` çıktısı ya da düz SQL. */
export type PlannedQuery = string | { sql: string; params?: unknown[] }

/** Sorguyu aynı parametrelerle EXPLAIN QUERY PLAN'la çalıştırır; tam tarama varsa kırılır. Yalnız SQLite. */
export function assertNoFullScan(
  db: Database.Database,
  query: PlannedQuery,
  opts: { allow?: readonly string[] } = {},
): void {
  const { sql, params = [] } = typeof query === "string" ? { sql: query } : query
  const rows = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...params) as QueryPlanRow[]
  const violations = parseQueryPlan(rows, opts.allow)
  if (violations.length > 0) {
    const plan = rows.map((row) => row.detail).join("\n  ")
    throw new Error(`tam tarama: ${violations.join("; ")}\nsorgu: ${sql}\nplan:\n  ${plan}`)
  }
}
