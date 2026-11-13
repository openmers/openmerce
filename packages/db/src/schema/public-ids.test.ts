import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { openMigratedDb } from "../testing/sqlite"
import { PUBLIC_ID_PREFIXES } from "./public-id-prefixes"

// Önek haritasının tek kaynağı `schema/public-id-prefixes.ts`'tir (yol haritası 6.5); bu test
// haritanın katalogla aynı olduğunu ve `public_id` sütunu olan her tablonun haritada bulunduğunu
// doğrular. Katalog satırı: 01-cekirdek-isletme.md "`public_id` önekleri", 02-ticaret.md `channels`.

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

describe("public_id önekleri", () => {
  it("önekler katalogla aynı", () => {
    const catalog = catalogPrefixes()
    for (const [table, prefix] of Object.entries(PUBLIC_ID_PREFIXES)) {
      if (table === "channels") {
        expect(doc("02-ticaret.md")).toMatch(/\| `public_id` \| TEXT \| hayır \| `chn_` \|/)
        continue
      }
      if (catalog[table] === undefined) continue // 02/03 tabloları bu satırda yok
      expect(catalog[table], table).toBe(prefix)
    }
    // Katalogdaki her önek haritada olmalı (eksik satır sessizce kaybolmasın).
    for (const [table, prefix] of Object.entries(catalog)) {
      expect(PUBLIC_ID_PREFIXES[table as keyof typeof PUBLIC_ID_PREFIXES], table).toBe(prefix)
    }
  })

  it("önekler benzersiz ve biçim kuralına uyuyor", () => {
    const values = Object.values(PUBLIC_ID_PREFIXES)
    expect(new Set(values).size).toBe(values.length)
    for (const prefix of values) expect(prefix).toMatch(/^[a-z]{2,4}_$/)
  })

  it("public_id sütunu olan her tablo haritada", () => {
    const tables = tablesWithPublicId()
    expect(tables.length).toBeGreaterThan(0)
    for (const table of tables) {
      expect(PUBLIC_ID_PREFIXES[table as keyof typeof PUBLIC_ID_PREFIXES], table).toBeDefined()
    }
  })
})
