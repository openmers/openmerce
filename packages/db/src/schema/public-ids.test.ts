import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { openMigratedDb } from "../testing/sqlite"

// public_id önekleri katalogla aynı mı: 01-cekirdek-isletme.md "`public_id` önekleri" satırı ve
// 02-ticaret.md `channels` satırı. Tablo → önek eşlemesi kodda henüz yok (core/features/ids,
// yol haritası 6.5); o gelince bu liste onunla karşılaştırılır.
const EXPECTED: Record<string, string> = {
  channels: "chn_",
  admin_users: "adm_",
  roles: "rol_",
  access_policies: "acp_",
  api_keys: "apk_",
  channel_publishable_keys: "cpk_",
  outbox: "evt_",
  audit_log: "aud_",
}

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

describe("public_id önekleri", () => {
  it("beklenen önekler katalogla aynı", () => {
    const catalog = catalogPrefixes()
    for (const [table, prefix] of Object.entries(EXPECTED)) {
      if (table === "channels") {
        expect(doc("02-ticaret.md")).toMatch(/\| `public_id` \| TEXT \| hayır \| `chn_` \|/)
      } else {
        expect(catalog[table], table).toBe(prefix)
      }
    }
    expect(new Set(Object.values(EXPECTED)).size).toBe(Object.keys(EXPECTED).length)
  })

  it("public_id sütunu olan her tablo listede", () => {
    const db = openMigratedDb()
    const tables = db
      .prepare(
        `SELECT m.name FROM sqlite_master m, pragma_table_info(m.name) c
         WHERE m.type = 'table' AND c.name = 'public_id' ORDER BY m.name`,
      )
      .pluck()
      .all()
    db.close()
    expect(tables).toEqual(Object.keys(EXPECTED).sort())
  })
})
