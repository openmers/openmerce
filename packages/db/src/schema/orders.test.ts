import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { NOW, seeder } from "../testing/commerce"
import { openMigratedDb } from "../testing/sqlite"

// 0015_orders: real better-sqlite3 :memory:, foreign_keys=ON, fresh DB per test.
let db: Database.Database
let s: ReturnType<typeof seeder>
beforeEach(() => {
  db = openMigratedDb()
  s = seeder(db)
})
afterEach(() => db.close())

const noScan = (table: string, detail: string[]) =>
  expect(detail.some((d) => new RegExp(`^SCAN ${table}\\b`).test(d))).toBe(false)

describe("sqlite_master", () => {
  it("unique, partial and ordered indexes exist", () => {
    expect(s.indexSql("orders_reservation_uq")).toMatch(/UNIQUE INDEX/)
    expect(s.indexSql("orders_number_uq")).toMatch(/\(`channel_id`,`number`\)/)
    expect(s.indexSql("orders_open_idx")).toMatch(/WHERE "orders"."state" = 'placed'/)
    expect(s.indexSql("orders_payment_due_idx")).toMatch(/WHERE "orders"."payment_status"/)
    expect(s.indexSql("order_notes_order_idx")).toMatch(/"pinned" DESC,"created_at" DESC/)
  })
})

describe("orders", () => {
  it("duplicate order number rejected within a channel, allowed in another", () => {
    const c = s.channel()
    s.order(c, "2026-1")
    expect(() => s.order(c, "2026-1")).toThrow(/UNIQUE constraint failed: orders.channel_id/)
    s.order(s.channel(), "2026-1")
  })

  it("settlement: ON CONFLICT(reservation_id) writes no second order", () => {
    const c = s.channel()
    const r = s.reservation("active", c)
    s.order(c, "2026-1", r)
    expect(() => s.order(c, "2026-2", r)).toThrow(/UNIQUE constraint failed: orders.reservation_id/)
    const settle = db.prepare(
      `INSERT INTO orders (public_id, number, channel_id, customer_id, reservation_id, currency,
         subtotal_net, tax_total, total_gross, discount_total, shipping_total, payment_status, lang,
         placed_at, updated_at)
       SELECT 'ord_dup', '2026-3', channel_id, ?, id, 'USD', 0, 0, 0, 0, 0, 'awaiting', 'en', 0, 0
       FROM checkout_reservations WHERE id = ?
       ON CONFLICT (reservation_id) DO NOTHING`,
    )
    expect(settle.run(s.customer(), r).changes).toBe(0)
  })

  it("settlement_token is granted to only one call", () => {
    const o = s.order()
    const r = db.prepare("SELECT reservation_id FROM orders WHERE id = ?").pluck().get(o)
    const claim = db.prepare(
      "UPDATE orders SET settlement_token = ? WHERE reservation_id = ? AND settlement_token IS NULL",
    )
    expect(claim.run("uuid-a", r).changes).toBe(1)
    expect(claim.run("uuid-b", r).changes).toBe(0)
    expect(db.prepare("SELECT settlement_token FROM orders").pluck().get()).toBe("uuid-a")
  })

  it("status checks; totals are integers; reservation FK", () => {
    const o = s.order()
    expect(() => s.run("UPDATE orders SET state = 'open' WHERE id = ?", o)).toThrow(
      /orders_state_ck/,
    )
    expect(() => s.run("UPDATE orders SET payment_status = 'paid_twice' WHERE id = ?", o)).toThrow(
      /orders_payment_status_ck/,
    )
    expect(() => s.run("UPDATE orders SET total_gross = 1.5 WHERE id = ?", o)).toThrow(
      /orders_totals_ck/,
    )
    expect(() => s.order(s.channel(), "x", 999)).toThrow(/FOREIGN KEY constraint failed/)
  })

  it("customer and channel lists use the index, no separate sort column", () => {
    const byCustomer = s.plan(
      "SELECT id FROM orders WHERE customer_id = ? ORDER BY placed_at DESC LIMIT 20",
      1,
    )
    expect(byCustomer.join("\n")).toMatch(/orders_customer_placed_idx/)
    expect(byCustomer.join("\n")).not.toMatch(/TEMP B-TREE/)
    noScan("orders", byCustomer)
    const byChannel = s.plan(
      "SELECT id FROM orders WHERE channel_id = ? AND placed_at > ? ORDER BY placed_at",
      1,
      NOW,
    )
    expect(byChannel.join("\n")).toMatch(/orders_channel_placed_idx/)
    noScan("orders", byChannel)
    const open = s.plan("SELECT id FROM orders WHERE state = 'placed'")
    expect(open.join("\n")).toMatch(/orders_open_idx/)
  })
})

describe("order subtables", () => {
  it("discount target consistent with the line id", () => {
    const o = s.order()
    const line = s.orderLine(o)
    const adjust = (target: string, lineId: number | null) =>
      s.run(
        `INSERT INTO order_adjustments (order_id, order_line_id, source, amount, target)
         VALUES (?, ?, 'manual', -100, ?)`,
        o,
        lineId,
        target,
      )
    adjust("line", line)
    adjust("order", null)
    adjust("shipping", null)
    expect(() => adjust("line", null)).toThrow(/order_adjustments_line_ck/)
    expect(() => adjust("order", line)).toThrow(/order_adjustments_line_ck/)
  })

  it("line quantity positive; FK", () => {
    const o = s.order()
    expect(() => s.orderLine(o, 0)).toThrow(/order_lines_quantity_ck/)
    expect(() => s.orderLine(999)).toThrow(/FOREIGN KEY constraint failed/)
  })

  it("note limited to 5000 chars; timeline index covers the sort", () => {
    const o = s.order()
    const note = (body: string) =>
      s.run(
        `INSERT INTO order_notes (order_id, body, visibility, author_id, author_name, created_at)
         VALUES (?, ?, 'internal', 1, 'Admin', ?)`,
        o,
        body,
        NOW,
      )
    note("x".repeat(5000))
    expect(() => note("x".repeat(5001))).toThrow(/order_notes_body_ck/)
    const detail = s.plan(
      `SELECT id FROM order_notes WHERE order_id = ? AND deleted_at IS NULL
       ORDER BY pinned DESC, created_at DESC`,
      o,
    )
    expect(detail.join("\n")).toMatch(/order_notes_order_idx/)
    expect(detail.join("\n")).not.toMatch(/TEMP B-TREE/)
  })

  it("guest access token digest unique", () => {
    const o = s.order()
    const grant = (hash: string) =>
      s.run(
        `INSERT INTO order_guest_access (order_id, token_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
        o,
        hash,
        NOW,
        NOW,
      )
    grant("h1")
    expect(() => grant("h1")).toThrow(/UNIQUE constraint failed: order_guest_access.token_hash/)
    grant("h2")
  })
})
