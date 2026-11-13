import { getTableColumns, getTableName, SQL, type Table } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import type { AtomicStatement } from "./atomic"

// The SQL engine is SQLite on both targets; text/parameter generation is the same (D1 and better-sqlite3).
const dialect = new SQLiteSyncDialect()

/**
 * `INSERT ... SELECT ... WHERE <guard>`: if the condition fails it **writes no rows**, and does not throw either.
 * Used inside a multi-statement `atomic()` to separate concurrent writes without "read first, then decide"
 * (e.g. an update whose `version` condition fails writes no audit/outbox row either).
 *
 * If an `SQL` value is given in `values` it is embedded as a subquery (the new row's `id`: a subquery via
 * `public_id`). Other values are bound via the column's driver mapping (`JSON`, `boolean`).
 */
export function guardedInsertStatement(
  table: Table,
  values: Record<string, unknown>,
  guard: SQL,
): AtomicStatement {
  const columns = Object.entries(getTableColumns(table))
  const names: string[] = []
  const select: string[] = []
  const params: unknown[] = []
  for (const [prop, column] of columns) {
    const value = values[prop]
    // Columns not given are left out of the list: `DEFAULT` (e.g. `unit_factor`) applies.
    if (value === undefined) continue
    names.push(`"${column.name}"`)
    if (value instanceof SQL) {
      const sub = dialect.sqlToQuery(value)
      select.push(`(${sub.sql})`)
      params.push(...sub.params)
      continue
    }
    select.push("?")
    params.push(column.mapToDriverValue(value) ?? null)
  }
  const where = dialect.sqlToQuery(guard)
  return {
    sql: `insert into "${getTableName(table)}" (${names.join(", ")}) select ${select.join(", ")} where ${where.sql}`,
    params: [...params, ...where.params],
  }
}

/** Converts a hand-built `sql` fragment into an `atomic()` statement (shapes the builder lacks, like CTE/`VALUES`). */
export function sqlStatement(query: SQL): AtomicStatement {
  const { sql, params } = dialect.sqlToQuery(query)
  return { sql, params }
}
