import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { NOW, seeder } from "../testing/commerce"
import { openMigratedDb } from "../testing/sqlite"

// 0010_tax-shipping: gerçek better-sqlite3 :memory:, foreign_keys=ON, her test taze DB.
let db: Database.Database
let s: ReturnType<typeof seeder>
beforeEach(() => {
  db = openMigratedDb()
  s = seeder(db)
})
afterEach(() => db.close())

describe("sqlite_master", () => {
  it("benzersiz ve ifade indeksleri var", () => {
    expect(s.indexSql("zone_members_uq")).toMatch(/coalesce\(`region`, ''\)/)
    expect(s.indexSql("tax_rates_uq")).toMatch(/coalesce\(`customer_group_id`, 0\)/)
    for (const idx of [
      "zones_public_id_uq",
      "tax_categories_code_uq",
      "tax_rates_public_id_uq",
      "shipping_methods_public_id_uq",
    ]) {
      expect(s.indexSql(idx), idx).toMatch(/UNIQUE INDEX/)
    }
  })

  it("channels bölge sütunları zones'a FK", () => {
    const fks = db.prepare("SELECT `from`, `table` FROM pragma_foreign_key_list('channels')").all()
    expect(fks).toContainEqual({ from: "default_tax_zone_id", table: "zones" })
    expect(fks).toContainEqual({ from: "default_shipping_zone_id", table: "zones" })
  })
})

describe("zone_members", () => {
  it("NULL bölgede de çift reddedilir; ülke kodu 2 harf", () => {
    const z = s.zone()
    const member = (country: string, region: string | null) =>
      s.run(
        "INSERT INTO zone_members (zone_id, country, region) VALUES (?, ?, ?)",
        z,
        country,
        region,
      )
    member("DE", null)
    expect(() => member("DE", null)).toThrow(/UNIQUE constraint failed/)
    member("DE", "DE-BY")
    expect(() => member("DE", "DE-BY")).toThrow(/UNIQUE constraint failed/)
    expect(() => member("DEU", null)).toThrow(/zone_members_country_ck/)
  })
})

describe("tax_rates", () => {
  it("(bölge, kategori, grup) NULL grupta da tek; FK", () => {
    const z = s.zone()
    const cat = s.taxCategory("standard")
    let n = 0
    const rate = (zoneId: number, group: number | null) =>
      s.run(
        `INSERT INTO tax_rates (public_id, zone_id, tax_category_id, customer_group_id, rate_bp, created_at, updated_at)
         VALUES (?, ?, ?, ?, 2000, ?, ?)`,
        `txr_${++n}`,
        zoneId,
        cat,
        group,
        NOW,
        NOW,
      )
    rate(z, null)
    expect(() => rate(z, null)).toThrow(/UNIQUE constraint failed/)
    rate(z, 1)
    expect(() => rate(999, null)).toThrow(/FOREIGN KEY constraint failed/)
    expect(() => s.taxCategory("standard")).toThrow(/UNIQUE constraint failed/)
  })
})

describe("shipping_methods", () => {
  it("vergi kategorisi zorunlu FK; depo FK'si", () => {
    const method = (taxCategoryId: number, locationId: number | null) =>
      s.run(
        `INSERT INTO shipping_methods (public_id, name, calculator_code, calculator_args, tax_category_id, pickup_location_id, created_at, updated_at)
         VALUES (?, 'Std', 'flat', '{}', ?, ?, ?, ?)`,
        `shm_${taxCategoryId}_${locationId}`,
        taxCategoryId,
        locationId,
        NOW,
        NOW,
      )
    method(s.taxCategory(), s.location())
    expect(() => method(999, null)).toThrow(/FOREIGN KEY constraint failed/)
    expect(() => method(s.taxCategory(), 999)).toThrow(/FOREIGN KEY constraint failed/)
  })
})
