import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { openMigratedDb } from "../testing/sqlite"
import { PUBLIC_ID_PREFIXES } from "./public-id-prefixes"

// The only source of the prefix map is `schema/public-id-prefixes.ts` (roadmap 6.5); this test
// verifies the map matches the catalog and that every table with a `public_id` column is in the map.
// Catalog row: 01-cekirdek-isletme.md "`public_id` prefixes", 02-ticaret.md `channels`.

const doc = (name: string) =>
  readFileSync(new URL(`../../../../docs/veritabani/${name}`, import.meta.url), "utf8")

/** "`adm_` admin_users, `rol_` roles, ..." → { admin_users: "adm_", ... } */
function catalogPrefixes(): Record<string, string> {
  const line = doc("01-cekirdek-isletme.md")
    .split("\n")
    .find((l) => l.startsWith("**`public_id` önekleri"))
  if (!line) throw new Error("01 katalogunda önek satırı yok")
  const out: Record<string, string> = {}
  for (const [, prefix = "", table = ""] of line.matchAll(/`([a-z]+_)` ([a-z_]+)/g))
    out[table] = prefix
  return out
}

function tablesWithPublicId(): string[] {
  const db = openMigratedDb()
  try {
    return db
      .prepare(
        `SELECT m.name FROM sqlite_master m, pragma_table_info(m.name) c
         WHERE m.type = 'table' AND c.name = 'public_id' ORDER BY m.name`,
      )
      .pluck()
      .all() as string[]
  } finally {
    db.close()
  }
}

describe("public_id prefixes", () => {
  it("prefixes match the catalog", () => {
    const catalog = catalogPrefixes()
    for (const [table, prefix] of Object.entries(PUBLIC_ID_PREFIXES)) {
      if (table === "channels") {
        expect(doc("02-ticaret.md")).toMatch(/\| `public_id` \| TEXT \| hayır \| `chn_` \|/)
        continue
      }
      if (catalog[table] === undefined) continue // 02/03 tables are not in this row
      expect(catalog[table], table).toBe(prefix)
    }
    // every prefix in the catalog must be in the map (a missing row must not vanish silently).
    for (const [table, prefix] of Object.entries(catalog)) {
      expect(PUBLIC_ID_PREFIXES[table as keyof typeof PUBLIC_ID_PREFIXES], table).toBe(prefix)
    }
  })

  it("prefixes are unique and follow the format rule", () => {
    const values = Object.values(PUBLIC_ID_PREFIXES)
    expect(new Set(values).size).toBe(values.length)
    for (const prefix of values) expect(prefix).toMatch(/^[a-z]{2,4}_$/)
  })

  it("every table with a public_id column is in the map", () => {
    const tables = tablesWithPublicId()
    expect(tables.length).toBeGreaterThan(0)
    for (const table of tables) {
      expect(PUBLIC_ID_PREFIXES[table as keyof typeof PUBLIC_ID_PREFIXES], table).toBeDefined()
    }
  })
})
