// Decision (01-platform-arayuzu §1): the shared format is Drizzle's `query.toSQL()` output; better-sqlite3
// `prepare(sql).run(...params)` and D1 `prepare(sql).bind(...params)` take it without conversion.
export type AtomicStatement = { sql: string; params: unknown[] }

/** Number of rows affected by each statement, in statement order. */
export type AtomicResult = number[]

/** `true` if every statement touched at least one row (an empty result is also `true`). */
export function allAffected(result: AtomicResult): boolean {
  return result.every((n) => n > 0)
}

/** Did statement `i` touch a row ("did I win"). An out-of-range index is an error. */
export function affected(result: AtomicResult, i: number): boolean {
  const n = result[i]
  if (n === undefined) throw new RangeError(`atomic sonucunda ${i}. ifade yok (${result.length})`)
  return n > 0
}
