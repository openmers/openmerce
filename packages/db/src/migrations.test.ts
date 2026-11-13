import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { orderMigrations } from "./migrator/plan"
import { MIGRATIONS_DIR, migrationFiles } from "./testing/sqlite"

// Eklemeli migration kapısı (04-asama-1-db-plani §1.5, 08-isletme/03-test.md "Ek kapılar").

// drizzle-kit SQLite'ta tür/kısıt değişikliğinde tabloyu yeniden kurar (__new_ + DROP + RENAME).
const DESTRUCTIVE = /\bDROP\s+TABLE\b|\bDROP\s+COLUMN\b|\bRENAME\b|__new_/i

/** wrangler --remote ayrıştırıcısı ilk `END;`'de keser: trigger başına tek `END;` (sondaki) olmalı. */
function remoteUnsafeTriggers(sql: string): string[] {
  const statements = sql.split(/-->\s*statement-breakpoint|(?=^\s*CREATE\s)/im)
  return statements.filter(
    (s) =>
      /CREATE\s+(TEMP\s+|TEMPORARY\s+)?TRIGGER/i.test(s) &&
      (s.match(/\bEND\s*;/gi) ?? []).length !== 1,
  )
}

const files = migrationFiles()
const read = (name: string) => readFileSync(join(MIGRATIONS_DIR, name), "utf8")

describe("migrations", () => {
  it("numaralar 0000'dan ardışık, boşluk ve tekrar yok", () => {
    expect(files.length).toBeGreaterThan(0)
    expect(() => orderMigrations(files)).not.toThrow()
  })

  it("her .sql journal'da var ve tersi", () => {
    const journal = JSON.parse(read("meta/_journal.json")) as { entries: { tag: string }[] }
    const tags = journal.entries.map((e) => `${e.tag}.sql`)
    expect([...tags].sort()).toEqual([...files].sort())
  })

  it.each(files)("%s yıkıcı değişiklik içermiyor", (name) => {
    expect(read(name)).not.toMatch(DESTRUCTIVE)
  })

  it.each(files)("%s uzak-güvenli (trigger gövdesinde END; yok)", (name) => {
    expect(remoteUnsafeTriggers(read(name))).toEqual([])
  })
})

describe("kapı kendini sınar", () => {
  it("yıkıcı kalıpları yakalar", () => {
    for (const bad of [
      "DROP TABLE `x`;",
      "ALTER TABLE x DROP COLUMN y;",
      "ALTER TABLE `__new_x` RENAME TO `x`;",
      "INSERT INTO `__new_x` SELECT * FROM x;",
    ]) {
      expect(bad).toMatch(DESTRUCTIVE)
    }
    expect("CREATE TABLE x (dropped_at integer);").not.toMatch(DESTRUCTIVE)
  })

  it("trigger gövdesindeki ek END;'i yakalar, düz trigger'ı geçirir", () => {
    const ok = "CREATE TRIGGER t AFTER INSERT ON x BEGIN UPDATE y SET n = n + 1; END;"
    const bad =
      "CREATE TRIGGER t AFTER INSERT ON x BEGIN\n  UPDATE y SET n = CASE WHEN 1 THEN 2 END;\nEND;"
    expect(remoteUnsafeTriggers(ok)).toEqual([])
    expect(remoteUnsafeTriggers(`${ok}\n--> statement-breakpoint\n${ok}`)).toEqual([])
    expect(remoteUnsafeTriggers(bad)).toHaveLength(1)
  })
})
