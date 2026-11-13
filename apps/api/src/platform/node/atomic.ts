import type { AtomicResult, AtomicStatement, BatchRows } from "@openmers/core"
import type Database from "better-sqlite3"

// shortcut: her çağrıda `prepare`; hazırlanmış ifade önbelleği (performans §7) ölçüm gerekirse eklenir.

/** İfadeleri tek senkron transaction'da sırayla çalıştırır; biri hata verirse hepsi geri alınır. */
export function nodeAtomic(db: Database.Database) {
  const run = db.transaction(
    (stmts: readonly AtomicStatement[]): AtomicResult =>
      stmts.map((s) => db.prepare(s.sql).run(...s.params).changes),
  )
  return async (stmts: readonly AtomicStatement[]): Promise<AtomicResult> => run(stmts)
}

/** Bağımsız okumalar, süreç içinde sırayla. */
export function nodeBatch(db: Database.Database) {
  return async (queries: readonly AtomicStatement[]): Promise<BatchRows[]> =>
    queries.map((q) => db.prepare(q.sql).all(...q.params) as BatchRows)
}
