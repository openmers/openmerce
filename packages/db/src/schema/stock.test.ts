import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { NOW, seeder } from "../testing/commerce"
import { openMigratedDb } from "../testing/sqlite"

// 0009_stock: gerçek better-sqlite3 :memory:, foreign_keys=ON, her test taze DB.
let db: Database.Database
let s: ReturnType<typeof seeder>
beforeEach(() => {
  db = openMigratedDb()
  s = seeder(db)
})
afterEach(() => db.close())

const level = (variantId: number, locationId: number, onHand = 5) =>
  s.run(
    `INSERT INTO stock_levels (variant_id, location_id, on_hand, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    variantId,
    locationId,
    onHand,
    NOW,
    NOW,
  )
// 02-ticaret `stock_levels` koşullu ayırma
const RESERVE = `UPDATE stock_levels SET reserved = reserved + :n, version = version + 1
  WHERE variant_id = :v AND location_id = :l AND on_hand - reserved - safety >= :n`

describe("sqlite_master", () => {
  it("indeksler var", () => {
    expect(s.indexSql("stock_locations_public_id_uq")).toMatch(/UNIQUE INDEX/)
    expect(s.indexSql("stock_movements_level_idx")).toMatch(/INDEX/)
    expect(s.indexSql("stock_movements_ref_idx")).toMatch(/INDEX/)
  })
})

describe("stock_levels", () => {
  it("çift (varyant, depo) reddedilir; FK", () => {
    const v = s.variant(s.product())
    const l = s.location()
    level(v, l)
    expect(() => level(v, l)).toThrow(/UNIQUE constraint failed/)
    level(v, s.location())
    expect(() => level(v, 999)).toThrow(/FOREIGN KEY constraint failed/)
  })

  it("sayaçlar eksiye inemez", () => {
    const v = s.variant(s.product())
    const l = s.location()
    expect(() => level(v, l, -1)).toThrow(/stock_levels_counts_ck/)
    level(v, l, 0)
    expect(() =>
      s.run("UPDATE stock_levels SET reserved = reserved - 1 WHERE variant_id = ?", v),
    ).toThrow(/stock_levels_counts_ck/)
  })

  it("koşullu ayırma son adedi bir kez verir", () => {
    const v = s.variant(s.product())
    const l = s.location()
    level(v, l, 1)
    const stmt = db.prepare(RESERVE)
    expect(stmt.run({ n: 1, v, l }).changes).toBe(1)
    expect(stmt.run({ n: 1, v, l }).changes).toBe(0)
  })

  it("kanal depo sorgusu PK ile aranır (tam tarama yok)", () => {
    const detail = s.plan(
      "SELECT * FROM stock_levels WHERE variant_id IN (?, ?) AND location_id IN (?, ?)",
      1,
      2,
      1,
      2,
    )
    expect(detail.join("\n")).toMatch(/SEARCH stock_levels USING (COVERING )?INDEX/)
    expect(detail.some((d) => /^SCAN stock_levels\b/.test(d))).toBe(false)
  })
})

describe("stock_movements / channel_stock_locations", () => {
  it("tür check'i; çift (kanal, depo) reddedilir", () => {
    const v = s.variant(s.product())
    const l = s.location()
    const move = (kind: string) =>
      s.run(
        `INSERT INTO stock_movements (variant_id, location_id, kind, quantity, units, created_at)
         VALUES (?, ?, ?, 1, 1, ?)`,
        v,
        l,
        kind,
        NOW,
      )
    move("adjustment")
    expect(() => move("theft")).toThrow(/stock_movements_kind_ck/)
    const c = s.channel()
    const link = () =>
      s.run(
        `INSERT INTO channel_stock_locations (channel_id, location_id, priority, created_at, updated_at)
         VALUES (?, ?, 0, ?, ?)`,
        c,
        l,
        NOW,
        NOW,
      )
    link()
    expect(link).toThrow(/UNIQUE constraint failed/)
  })
})
