import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { NOW, seeder } from "../testing/commerce"
import { openMigratedDb } from "../testing/sqlite"

// `checkout_reservations` (0013), `promotion_usage` (0012), `payment_methods`, `pending_payments`
// (0014): rezervasyon ancak ödeme yöntemi tablosuyla yazılabildiği için ayrı dosya.
let db: Database.Database
let s: ReturnType<typeof seeder>
beforeEach(() => {
  db = openMigratedDb()
  s = seeder(db)
})
afterEach(() => db.close())

// 02-ticaret `checkout_reservations`: bırakma yalnız active/payment_pending'den
const RELEASE = `UPDATE checkout_reservations SET status = 'released', updated_at = ?
  WHERE id = ? AND status IN ('active', 'payment_pending')`

describe("checkout_reservations", () => {
  it("durum ve kaynak check'i; kaynak varsayılanı web", () => {
    const r = s.reservation()
    expect(db.prepare("SELECT source FROM checkout_reservations").pluck().get()).toBe("web")
    expect(() => s.reservation("pending")).toThrow(/checkout_reservations_status_ck/)
    expect(() => s.run("UPDATE checkout_reservations SET source = 'pos' WHERE id = ?", r)).toThrow(
      /checkout_reservations_source_ck/,
    )
  })

  it("bırakma tek kez kazanır; settled bırakılamaz", () => {
    const r = s.reservation()
    const release = db.prepare(RELEASE)
    expect(release.run(NOW, r).changes).toBe(1)
    expect(release.run(NOW, r).changes).toBe(0)
    expect(release.run(NOW, s.reservation("settled")).changes).toBe(0)
  })

  it("süpürme sorgusu kısmi indeksi kullanır", () => {
    const detail = s.plan(
      `SELECT id FROM checkout_reservations
       WHERE status IN ('active', 'payment_pending') AND expires_at < ?`,
      NOW,
    )
    expect(detail.join("\n")).toMatch(/checkout_reservations_open_idx/)
    expect(detail.some((d) => /^SCAN checkout_reservations\b/.test(d))).toBe(false)
  })

  it("ödeme yöntemi FK'si zorunlu; yöntem kodu benzersiz", () => {
    s.paymentMethod("cod")
    expect(() => s.paymentMethod("cod")).toThrow(/UNIQUE constraint failed: payment_methods.code/)
    expect(() =>
      s.run(
        "UPDATE checkout_reservations SET payment_method_id = 999 WHERE id = ?",
        s.reservation(),
      ),
    ).toThrow(/FOREIGN KEY constraint failed/)
  })
})

describe("promotion_usage", () => {
  const use = (promotionId: number, reservationId: number, customerId: number | null) =>
    s.run(
      `INSERT INTO promotion_usage (promotion_id, customer_id, reservation_id, created_at)
       VALUES (?, ?, ?, ?)`,
      promotionId,
      customerId,
      reservationId,
      NOW,
    )

  it("(promosyon, rezervasyon) tek satır; rezervasyon FK", () => {
    const p = s.promotion()
    const r = s.reservation()
    use(p, r, null)
    expect(() => use(p, r, null)).toThrow(/UNIQUE constraint failed/)
    expect(() => use(p, 999, null)).toThrow(/FOREIGN KEY constraint failed/)
  })

  it("müşteri başına sınır koşullu INSERT'le; sayım indeksle", () => {
    const p = s.promotion()
    s.run("UPDATE promotions SET per_customer_limit = 1 WHERE id = ?", p)
    const c = s.customer()
    const guarded = db.prepare(
      `INSERT INTO promotion_usage (promotion_id, customer_id, reservation_id, created_at)
       SELECT p.id, :c, :r, 0 FROM promotions p WHERE p.id = :p AND (p.per_customer_limit IS NULL
         OR (SELECT count(*) FROM promotion_usage WHERE promotion_id = :p AND customer_id = :c) < p.per_customer_limit)`,
    )
    expect(guarded.run({ p, c, r: s.reservation() }).changes).toBe(1)
    expect(guarded.run({ p, c, r: s.reservation() }).changes).toBe(0)
    const detail = s.plan(
      "SELECT count(*) FROM promotion_usage WHERE promotion_id = ? AND customer_id = ?",
      p,
      c,
    )
    expect(detail.join("\n")).toMatch(/promotion_usage_customer_idx/)
  })
})

describe("pending_payments", () => {
  const pending = (reservationId: number, state = "pending") =>
    s.run(
      `INSERT INTO pending_payments (reservation_id, payment_method_id, amount, currency, state,
         expires_at, created_at, updated_at) VALUES (?, ?, 1000, 'USD', ?, ?, ?, ?)`,
      reservationId,
      s.paymentMethod(),
      state,
      NOW,
      NOW,
      NOW,
    )

  it("rezervasyon başına tek bekleyen ödeme; durum ve tutar check'i", () => {
    const r = s.reservation("payment_pending")
    pending(r)
    expect(() => pending(r)).toThrow(/UNIQUE constraint failed: pending_payments.reservation_id/)
    expect(() => pending(s.reservation(), "paid")).toThrow(/pending_payments_state_ck/)
    expect(() =>
      s.run("UPDATE pending_payments SET amount = 1.5 WHERE reservation_id = ?", r),
    ).toThrow(/pending_payments_amount_ck/)
  })

  it("süpürme kısmi indeksle", () => {
    const detail = s.plan(
      "SELECT id FROM pending_payments WHERE state = 'pending' AND expires_at < ?",
      NOW,
    )
    expect(detail.join("\n")).toMatch(/pending_payments_sweep_idx/)
  })
})
