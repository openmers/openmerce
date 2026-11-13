import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { NOW, seeder } from "../testing/commerce"
import { openMigratedDb } from "../testing/sqlite"

// 0012_promotions: gerçek better-sqlite3 :memory:, foreign_keys=ON, her test taze DB.
let db: Database.Database
let s: ReturnType<typeof seeder>
beforeEach(() => {
  db = openMigratedDb()
  s = seeder(db)
})
afterEach(() => db.close())

// 02-ticaret `promotions` koşullu sayaç (NULL sınır düzeltmesiyle)
const INCREMENT = `UPDATE promotions SET used = used + 1
  WHERE id = ? AND (usage_limit IS NULL OR used < usage_limit)`

describe("promotions", () => {
  it("kupon kodu yalnız doluyken benzersiz", () => {
    s.promotion("SUMMER")
    expect(() => s.promotion("SUMMER")).toThrow(/UNIQUE constraint failed: promotions.coupon_code/)
    s.promotion(null)
    s.promotion(null)
  })

  it("sınırlı kuponun son kullanımı bir kez; sınırsız hep artar", () => {
    const limited = s.promotion("ONE", 1)
    const free = s.promotion(null)
    const inc = db.prepare(INCREMENT)
    expect(inc.run(limited).changes).toBe(1)
    expect(inc.run(limited).changes).toBe(0)
    expect(inc.run(free).changes).toBe(1)
    expect(inc.run(free).changes).toBe(1)
    expect(() => s.run("UPDATE promotions SET used = -1 WHERE id = ?", free)).toThrow(
      /promotions_used_ck/,
    )
  })

  it("koşul ve eylemler JSON dizi", () => {
    expect(() =>
      s.run(
        `INSERT INTO promotions (public_id, name, enabled, priority, conditions, actions, stackable,
           created_at, updated_at) VALUES ('prm_x', 'x', 1, 0, '{}', '[]', 0, ?, ?)`,
        NOW,
        NOW,
      ),
    ).toThrow(/promotions_conditions_ck/)
  })
})
