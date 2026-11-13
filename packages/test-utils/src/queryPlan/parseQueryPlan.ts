// Saf: EXPLAIN QUERY PLAN satırları → tam tarama ihlalleri (plan §2.4).

export type QueryPlanRow = { id: number; parent: number; notused: number; detail: string }

const INDEXED = /USING (?:COVERING )?INDEX|USING INTEGER PRIMARY KEY|VIRTUAL TABLE INDEX/

/** İndekssiz `SCAN <tablo>` satırlarının detail'leri. `allow`: bilerek taranan küçük tablolar. */
export function parseQueryPlan(
  rows: readonly QueryPlanRow[],
  allow: readonly string[] = [],
): string[] {
  return rows
    .map((row) => row.detail)
    .filter((detail) => {
      const table = /^SCAN (\S+)/.exec(detail)?.[1]
      if (!table || detail === "SCAN CONSTANT ROW") return false
      return !INDEXED.test(detail) && !allow.includes(table)
    })
}
