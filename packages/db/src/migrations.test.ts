import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { orderMigrations } from "./migrator/plan"
import { MIGRATIONS_DIR, migrationFiles } from "./testing/sqlite"

// Additive-only migration gate (04-asama-1-db-plani §1.5, 08-isletme/03-test.md "Extra gates").

// drizzle-kit recreates the table on type/constraint changes in SQLite (__new_ + DROP + RENAME).
const DESTRUCTIVE = /\bDROP\s+TABLE\b|\bDROP\s+COLUMN\b|\bRENAME\b|__new_/i

/** wrangler --remote parser stops at the first `END;`: one `END;` per trigger (the trailing one). */
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
  it("numbers consecutive from 0000, no gaps or duplicates", () => {
    expect(files.length).toBeGreaterThan(0)
    expect(() => orderMigrations(files)).not.toThrow()
  })

  it("her .sql journal'da var ve tersi", () => {
    const journal = JSON.parse(read("meta/_journal.json")) as { entries: { tag: string }[] }
    const tags = journal.entries.map((e) => `${e.tag}.sql`)
    expect([...tags].sort()).toEqual([...files].sort())
  })

  it.each(files)("%s has no destructive change", (name) => {
    expect(read(name)).not.toMatch(DESTRUCTIVE)
  })

  it.each(files)("%s is remote-safe (no END; in a trigger body)", (name) => {
    expect(remoteUnsafeTriggers(read(name))).toEqual([])
  })
})

describe("the gate tests itself", () => {
  it("catches destructive patterns", () => {
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

  it("catches an extra END; in a trigger body, passes a plain trigger", () => {
    const ok = "CREATE TRIGGER t AFTER INSERT ON x BEGIN UPDATE y SET n = n + 1; END;"
    const bad =
      "CREATE TRIGGER t AFTER INSERT ON x BEGIN\n  UPDATE y SET n = CASE WHEN 1 THEN 2 END;\nEND;"
    expect(remoteUnsafeTriggers(ok)).toEqual([])
    expect(remoteUnsafeTriggers(`${ok}\n--> statement-breakpoint\n${ok}`)).toEqual([])
    expect(remoteUnsafeTriggers(bad)).toHaveLength(1)
  })
})
