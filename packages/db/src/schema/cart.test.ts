import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { seeder } from "../testing/commerce"
import { openMigratedDb } from "../testing/sqlite"

// 0013_cart (sepet ve satırları): gerçek better-sqlite3 :memory:, foreign_keys=ON, her test taze DB.
// `checkout_reservations` testleri checkout.test.ts'te (payment_method_id FK'si 0014'e bağlı).
let db: Database.Database
let s: ReturnType<typeof seeder>
beforeEach(() => {
  db = openMigratedDb()
  s = seeder(db)
})
afterEach(() => db.close())

const KEY = "0123456789abcdef0123456789abcdef"
// 02-ticaret `cart_lines`: ekleme tek koşullu yazma
const ADD = `INSERT INTO cart_lines (cart_id, variant_id, quantity, line_key, created_at, updated_at)
  VALUES (?, ?, ?, ?, 0, 0)
  ON CONFLICT (cart_id, variant_id, line_key) DO UPDATE SET quantity = quantity + excluded.quantity`

describe("sqlite_master", () => {
  it("indeksler var, rezervasyonda kısmi indeks", () => {
    expect(s.indexSql("cart_lines_uq")).toMatch(/UNIQUE INDEX/)
    expect(s.indexSql("carts_customer_status_idx")).toMatch(/INDEX/)
    expect(s.indexSql("checkout_reservations_open_idx")).toMatch(
      /WHERE "checkout_reservations"."status" IN \('active', 'payment_pending'\)/,
    )
  })
})

describe("carts", () => {
  it("durum ve para birimi check'i; FK", () => {
    const c = s.cart()
    expect(() => s.run("UPDATE carts SET status = 'open' WHERE id = ?", c)).toThrow(
      /carts_status_ck/,
    )
    expect(() => s.run("UPDATE carts SET currency = 'US' WHERE id = ?", c)).toThrow(
      /carts_currency_ck/,
    )
    expect(() => s.cart(s.channel(), 999)).toThrow(/FOREIGN KEY constraint failed/)
  })

  it("activeCart sorgusu indeksle aranır", () => {
    const detail = s.plan("SELECT id FROM carts WHERE customer_id = ? AND status = 'active'", 1)
    expect(detail.join("\n")).toMatch(/carts_customer_status_idx/)
    expect(detail.some((d) => /^SCAN carts\b/.test(d))).toBe(false)
  })
})

describe("cart_lines", () => {
  it("(sepet, varyant, line_key) tek satır; ON CONFLICT adedi toplar", () => {
    const c = s.cart()
    const v = s.variant(s.product())
    const add = db.prepare(ADD)
    add.run(c, v, 1, "")
    add.run(c, v, 2, "")
    add.run(c, v, 1, KEY)
    const rows = db
      .prepare("SELECT line_key, quantity FROM cart_lines WHERE cart_id = ? ORDER BY line_key")
      .all(c)
    expect(rows).toEqual([
      { line_key: "", quantity: 3 },
      { line_key: KEY, quantity: 1 },
    ])
    expect(() =>
      s.run(
        "INSERT INTO cart_lines (cart_id, variant_id, quantity, line_key, created_at, updated_at) VALUES (?, ?, 1, '', 0, 0)",
        c,
        v,
      ),
    ).toThrow(/UNIQUE constraint failed/)
  })

  it("line_key biçimi ve adet check'i", () => {
    const c = s.cart()
    const v = s.variant(s.product())
    const add = db.prepare(ADD)
    expect(() => add.run(c, v, 1, KEY.toUpperCase())).toThrow(/cart_lines_line_key_ck/)
    expect(() => add.run(c, v, 1, "abc")).toThrow(/cart_lines_line_key_ck/)
    expect(() => add.run(c, v, 0, "")).toThrow(/cart_lines_quantity_ck/)
    expect(() => add.run(c, 999, 1, "")).toThrow(/FOREIGN KEY constraint failed/)
  })

  it("sepet sert silinince satırlar da silinir", () => {
    const c = s.cart()
    db.prepare(ADD).run(c, s.variant(s.product()), 1, "")
    s.run("DELETE FROM carts WHERE id = ?", c)
    expect(db.prepare("SELECT count(*) FROM cart_lines").pluck().get()).toBe(0)
  })
})
