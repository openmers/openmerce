// Karar (01-platform-arayuzu §1): ortak biçim Drizzle `query.toSQL()` çıktısıdır; better-sqlite3
// `prepare(sql).run(...params)` ve D1 `prepare(sql).bind(...params)` bunu dönüştürmeden alır.
export type AtomicStatement = { sql: string; params: unknown[] }

/** Her ifadenin etkilediği satır sayısı, ifade sırasıyla. */
export type AtomicResult = number[]

/** Bütün ifadeler en az bir satıra dokunduysa `true` (boş sonuç da `true`). */
export function allAffected(result: AtomicResult): boolean {
  return result.every((n) => n > 0)
}

/** `i`. ifade bir satıra dokundu mu ("kazandım mı"). Aralık dışı indeks hatadır. */
export function affected(result: AtomicResult, i: number): boolean {
  const n = result[i]
  if (n === undefined) throw new RangeError(`atomic sonucunda ${i}. ifade yok (${result.length})`)
  return n > 0
}
