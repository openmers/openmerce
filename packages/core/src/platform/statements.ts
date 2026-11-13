import { getTableColumns, getTableName, SQL, type Table } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import type { AtomicStatement } from "./atomic"

// SQL motoru iki hedefte de SQLite; metin/parametre üretimi aynı (D1 ve better-sqlite3).
const dialect = new SQLiteSyncDialect()

/**
 * `INSERT ... SELECT ... WHERE <guard>`: koşul tutmazsa **hiç satır yazmaz**, hata da vermez.
 * Çok ifadeli `atomic()` içinde "önce oku, sonra karar ver" yapmadan eşzamanlı yazmayı ayırmak için
 * kullanılır (ör. `version` koşulu tutmayan güncellemenin denetim/outbox satırı da yazılmaz).
 *
 * `values` içinde `SQL` verilirse alt sorgu olarak gömülür (yeni satırın `id`'si: `public_id`
 * üzerinden alt sorgu). Diğer değerler sütunun sürücü eşlemesiyle (`JSON`, `boolean`) bağlanır.
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
    // Verilmeyen sütun listeden çıkar: `DEFAULT` (ör. `unit_factor`) uygulanır.
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

/** Elle kurulan `sql` parçasını `atomic()` ifadesine çevirir (CTE/`VALUES` gibi kurucuda olmayan biçimler). */
export function sqlStatement(query: SQL): AtomicStatement {
  const { sql, params } = dialect.sqlToQuery(query)
  return { sql, params }
}
