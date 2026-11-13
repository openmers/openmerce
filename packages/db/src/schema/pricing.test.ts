import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { NOW, seeder } from "../testing/commerce"
import { openMigratedDb } from "../testing/sqlite"

// 0008_pricing: real better-sqlite3 :memory:, foreign_keys=ON, fresh DB per test.
let db: Database.Database
let s: ReturnType<typeof seeder>
beforeEach(() => {
  db = openMigratedDb()
  s = seeder(db)
})
afterEach(() => db.close())

let plSeq = 0
const priceList = (channelId: number, type = "base", currency = "USD") =>
  s.run(
    `INSERT INTO price_lists (public_id, name, channel_id, currency, type, priority, includes_tax, created_at, updated_at)
     VALUES (?, 'L', ?, ?, ?, 0, 0, ?, ?)`,
    `pl_${++plSeq}`,
    channelId,
    currency,
    type,
    NOW,
    NOW,
  )
const price = (listId: number, variantId: number, amount: unknown, minQty = 1) =>
  s.run(
    `INSERT INTO prices (price_list_id, variant_id, min_qty, amount, currency, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'USD', ?, ?)`,
    listId,
    variantId,
    minQty,
    amount,
    NOW,
    NOW,
  )
const rate = (day: string, base: string, quote: string, rateE9: unknown) =>
  s.run(
    `INSERT INTO currency_rates (day, base, quote, rate_e9, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'manual', ?, ?)`,
    day,
    base,
    quote,
    rateE9,
    NOW,
    NOW,
  )

describe("sqlite_master", () => {
  it("unique, partial and expression indexes exist", () => {
    expect(s.indexSql("price_lists_public_id_uq")).toMatch(/UNIQUE INDEX/)
    expect(s.indexSql("price_lists_base_uq")).toMatch(/UNIQUE INDEX .*WHERE .*type.* = 'base'/)
    expect(s.indexSql("price_list_targets_uq")).toMatch(
      /ifnull\(`customer_group_id`, 0\),ifnull\(`company_id`, 0\)/,
    )
    for (const idx of [
      "price_lists_channel_type_idx",
      "price_lists_fx_source_idx",
      "price_list_targets_group_idx",
      "price_list_targets_company_idx",
      "currency_rates_pair_idx",
    ]) {
      expect(s.indexSql(idx), idx).toMatch(/INDEX/)
    }
  })

  it("channels.default_price_list_id FK to price_lists", () => {
    const fks = db.prepare("SELECT `from`, `table` FROM pragma_foreign_key_list('channels')").all()
    expect(fks).toContainEqual({ from: "default_price_list_id", table: "price_lists" })
  })
})

describe("price_lists", () => {
  it("one base per channel and currency; sale is free", () => {
    const c = s.channel()
    priceList(c)
    expect(() => priceList(c)).toThrow(/UNIQUE constraint failed/)
    priceList(c, "base", "EUR")
    priceList(c, "sale")
    priceList(c, "sale")
    expect(() => priceList(c, "draft")).toThrow(/price_lists_type_ck/)
  })
})

describe("price_list_targets", () => {
  it("duplicate rejected even with NULL target; group and company cannot combine", () => {
    const pl = priceList(s.channel())
    const target = (group: number | null, company: number | null) =>
      s.run(
        `INSERT INTO price_list_targets (price_list_id, customer_group_id, company_id, created_at)
         VALUES (?, ?, ?, ?)`,
        pl,
        group,
        company,
        NOW,
      )
    target(null, null)
    expect(() => target(null, null)).toThrow(/UNIQUE constraint failed/)
    target(1, null)
    expect(() => target(1, null)).toThrow(/UNIQUE constraint failed/)
    expect(() => target(1, 2)).toThrow(/price_list_targets_target_ck/)
  })
})

describe("prices", () => {
  it("duplicate (list, variant, tier) rejected; amount is integer and ≥ 0", () => {
    const pl = priceList(s.channel())
    const v = s.variant(s.product())
    price(pl, v, 1999)
    expect(() => price(pl, v, 1500)).toThrow(/UNIQUE constraint failed/)
    price(pl, v, 1500, 10)
    expect(() => price(pl, v, 19.99, 50)).toThrow(/prices_amount_ck/)
    expect(() => price(pl, v, -1, 50)).toThrow(/prices_amount_ck/)
    expect(() => price(pl, 999, 100)).toThrow(/FOREIGN KEY constraint failed/)
  })

  it("storefront query uses the PK (no full scan)", () => {
    const detail = s.plan(
      "SELECT * FROM prices WHERE variant_id IN (?, ?) AND price_list_id IN (?, ?)",
      1,
      2,
      1,
      2,
    )
    expect(detail.join("\n")).toMatch(/SEARCH prices USING (COVERING )?INDEX/)
    expect(detail.some((d) => /^SCAN prices\b/.test(d))).toBe(false)
  })
})

describe("currency_rates", () => {
  it("(day, base, quote) unique; rate_e9 positive integer; day format", () => {
    rate("2026-11-13", "USD", "EUR", 920_000_000)
    expect(() => rate("2026-11-13", "USD", "EUR", 921_000_000)).toThrow(/UNIQUE constraint failed/)
    rate("2026-11-14", "USD", "EUR", 921_000_000)
    expect(() => rate("2026-11-15", "USD", "EUR", 0.92)).toThrow(/currency_rates_rate_ck/)
    expect(() => rate("13.11.2026", "USD", "EUR", 1)).toThrow(/currency_rates_day_ck/)
    expect(() => rate("2026-11-15", "USD", "USD", 1)).toThrow(/currency_rates_pair_ck/)
  })

  it("latest rate of the pair found via index", () => {
    const detail = s.plan(
      "SELECT rate_e9 FROM currency_rates WHERE base = ? AND quote = ? ORDER BY day DESC LIMIT 1",
      "USD",
      "EUR",
    )
    expect(detail.join("\n")).toMatch(/SEARCH currency_rates USING (COVERING )?INDEX/)
  })
})
