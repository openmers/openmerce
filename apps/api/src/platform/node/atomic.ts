import type { AtomicResult, AtomicStatement, BatchRows } from "@openmers/core"
import type Database from "better-sqlite3"

// shortcut: `prepare` on every call; a prepared statement cache (performance §7) gets added if measurements call for it.

/** Runs the statements in order in one synchronous transaction; if one fails, all are rolled back. */
export function nodeAtomic(db: Database.Database) {
  const run = db.transaction(
    (stmts: readonly AtomicStatement[]): AtomicResult =>
      stmts.map((s) => db.prepare(s.sql).run(...s.params).changes),
  )
  return async (stmts: readonly AtomicStatement[]): Promise<AtomicResult> => run(stmts)
}

/** Independent reads, in order within the process. */
export function nodeBatch(db: Database.Database) {
  return async (queries: readonly AtomicStatement[]): Promise<BatchRows[]> =>
    queries.map((q) => db.prepare(q.sql).all(...q.params) as BatchRows)
}
