import { expect, it } from "vitest"
import { loadMigrations } from "./migrations"
import { describeOnTargets } from "./runner"

const NOW = 1_700_000_000_000

describeOnTargets("runner", (getDb) => {
  it("SELECT 1", () => {
    expect(getDb().prepare("SELECT 1").pluck().get()).toBe(1)
  })

  it("yazar (sonraki test bu satırı görmemeli)", () => {
    getDb()
      .prepare(
        "INSERT INTO settings (scope, scope_id, key, value, created_at, updated_at) VALUES ('global', 0, 'a.b', '1', ?, ?)",
      )
      .run(NOW, NOW)
    expect(getDb().prepare("SELECT count(*) FROM settings").pluck().get()).toBe(1)
  })

  it("testler arası veri sızmıyor", () => {
    expect(getDb().prepare("SELECT count(*) FROM settings").pluck().get()).toBe(0)
  })

  it("foreign_keys açık", () => {
    expect(getDb().pragma("foreign_keys", { simple: true })).toBe(1)
    expect(() =>
      getDb()
        .prepare(
          "INSERT INTO channel_domains (channel_id, domain, is_primary, created_at, updated_at) VALUES (999, 'x.test', 1, ?, ?)",
        )
        .run(NOW, NOW),
    ).toThrow(/FOREIGN KEY/)
  })

  it("migration'lar uygulanmış", () => {
    const tables = getDb()
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .pluck()
      .all()
    expect(tables).toEqual(expect.arrayContaining(["settings", "channels", "channel_domains"]))
    const applied = getDb().prepare("SELECT name FROM d1_migrations ORDER BY id").pluck().all()
    expect(applied).toEqual(loadMigrations().map((m) => m.name))
  })
})
