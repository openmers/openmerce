import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { NOW, seeder } from "../testing/commerce"
import { openMigratedDb } from "../testing/sqlite"

// 0014_payments (`payments`, `refunds`): order_id depends on 0015, return_id on 0016.
let db: Database.Database
let s: ReturnType<typeof seeder>
beforeEach(() => {
  db = openMigratedDb()
  s = seeder(db)
})
afterEach(() => db.close())

const payment = (orderId: number, methodId: number, ref: string | null, amount = 1000) =>
  s.run(
    `INSERT INTO payments (public_id, order_id, payment_method_id, amount, currency, state,
       provider_reference, created_at, updated_at) VALUES (?, ?, ?, ?, 'USD', 'settled', ?, ?, ?)`,
    `pay_${Math.random()}`,
    orderId,
    methodId,
    amount,
    ref,
    NOW,
    NOW,
  )
const refund = (paymentId: number, orderId: number, extra: Record<string, unknown> = {}) =>
  db
    .prepare(
      `INSERT INTO refunds (public_id, payment_id, order_id, amount, currency, state, source,
         provider_event_id, provider_refund_id, idempotency_key, reverses_refund_id, created_at, updated_at)
       VALUES (:pid, :p, :o, 100, 'USD', :state, 'admin', :ev, :rf, :key, :rev, 0, 0)`,
    )
    .run({
      pid: `ref_${Math.random()}`,
      p: paymentId,
      o: orderId,
      state: "settled",
      ev: null,
      rf: null,
      key: null,
      rev: null,
      ...extra,
    }).lastInsertRowid as number

// 02-ticaret `refunds`: cumulative provider refund
const CUMULATIVE = `UPDATE payments SET refunded_amount = :n
  WHERE id = :id AND refunded_amount < :n AND :n + external_refunded_amount <= amount`

describe("payments", () => {
  it("one payment per (method, provider reference); no-reference is free", () => {
    const o = s.order()
    const m = s.paymentMethod()
    payment(o, m, "pi_1")
    expect(() => payment(o, m, "pi_1")).toThrow(/UNIQUE constraint failed/)
    payment(o, s.paymentMethod(), "pi_1")
    payment(o, m, null)
    payment(o, m, null)
    expect(() => payment(999, m, null)).toThrow(/FOREIGN KEY constraint failed/)
  })

  it("cumulative refund is a no-op on duplicate and out-of-order delivery", () => {
    const p = payment(s.order(), s.paymentMethod(), null)
    const apply = db.prepare(CUMULATIVE)
    expect(apply.run({ id: p, n: 300 }).changes).toBe(1)
    expect(apply.run({ id: p, n: 300 }).changes).toBe(0)
    expect(apply.run({ id: p, n: 200 }).changes).toBe(0)
    expect(apply.run({ id: p, n: 1001 }).changes).toBe(0)
  })

  it("refund total cannot exceed the amount (check is the last defense)", () => {
    const p = payment(s.order(), s.paymentMethod(), null)
    s.run(
      "UPDATE payments SET refunded_amount = 600, external_refunded_amount = 400 WHERE id = ?",
      p,
    )
    expect(() =>
      s.run("UPDATE payments SET external_refunded_amount = 401 WHERE id = ?", p),
    ).toThrow(/payments_refunded_ck/)
    expect(() => s.run("UPDATE payments SET state = 'paid' WHERE id = ?", p)).toThrow(
      /payments_state_ck/,
    )
  })
})

describe("refunds", () => {
  it("event, provider refund and idempotency key are unique", () => {
    const o = s.order()
    const p = payment(o, s.paymentMethod(), null)
    refund(p, o, { ev: "evt_1", rf: "re_1", key: "k1" })
    expect(() => refund(p, o, { ev: "evt_1" })).toThrow(/UNIQUE constraint failed/)
    expect(() => refund(p, o, { rf: "re_1" })).toThrow(/UNIQUE constraint failed/)
    expect(() => refund(p, o, { key: "k1" })).toThrow(/UNIQUE constraint failed/)
    refund(p, o)
    refund(p, o)
  })

  it("a refund is cancelled by a reversal entry only once", () => {
    const o = s.order()
    const p = payment(o, s.paymentMethod(), null)
    const r = refund(p, o)
    refund(p, o, { rev: r })
    expect(() => refund(p, o, { rev: r })).toThrow(/UNIQUE constraint failed/)
    expect(() => refund(p, o, { state: "done" })).toThrow(/refunds_state_ck/)
  })

  it("reconciliation query uses the partial index", () => {
    const detail = s.plan("SELECT id FROM refunds WHERE state = 'unknown'")
    expect(detail.join("\n")).toMatch(/refunds_unknown_idx/)
  })
})
