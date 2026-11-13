import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { NOW, seeder } from "../testing/commerce"
import { openMigratedDb } from "../testing/sqlite"

// 0016_fulfillment: gerçek better-sqlite3 :memory:, foreign_keys=ON, her test taze DB.
let db: Database.Database
let s: ReturnType<typeof seeder>
beforeEach(() => {
  db = openMigratedDb()
  s = seeder(db)
})
afterEach(() => db.close())

const fulfillment = (orderId: number, state = "pending") =>
  s.run(
    `INSERT INTO fulfillments (public_id, order_id, state, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    `ful_${Math.random()}`,
    orderId,
    state,
    NOW,
    NOW,
  )
// 02-ticaret `fulfillment_lines`: gönderilen adet sipariş adedini aşamaz, iptal sayılmaz
const SHIP = `INSERT INTO fulfillment_lines (fulfillment_id, order_line_id, quantity)
  SELECT :f, ol.id, :q FROM order_lines ol WHERE ol.id = :l AND (SELECT coalesce(sum(fl.quantity), 0)
    FROM fulfillment_lines fl JOIN fulfillments f ON f.id = fl.fulfillment_id
    WHERE fl.order_line_id = :l AND f.state <> 'cancelled') + :q <= ol.quantity`

describe("fulfillments", () => {
  it("gönderilen adet sipariş adedini aşmaz; iptal edilen sayılmaz", () => {
    const o = s.order()
    const l = s.orderLine(o, 2)
    const ship = db.prepare(SHIP)
    const cancelled = fulfillment(o, "cancelled")
    expect(ship.run({ f: cancelled, l, q: 2 }).changes).toBe(1)
    expect(ship.run({ f: fulfillment(o), l, q: 2 }).changes).toBe(1)
    expect(ship.run({ f: fulfillment(o), l, q: 1 }).changes).toBe(0)
  })

  it("durum check'i; (gönderim, satır) tek; taşıyıcı eşleşmesi indeksle", () => {
    const o = s.order()
    expect(() => fulfillment(o, "lost")).toThrow(/fulfillments_state_ck/)
    const f = fulfillment(o)
    const l = s.orderLine(o)
    const line = () =>
      s.run(
        "INSERT INTO fulfillment_lines (fulfillment_id, order_line_id, quantity) VALUES (?, ?, 1)",
        f,
        l,
      )
    line()
    expect(line).toThrow(/UNIQUE constraint failed/)
    const detail = s.plan(
      "SELECT id FROM fulfillments WHERE carrier = ? AND tracking_number = ?",
      "ups",
      "1Z",
    )
    expect(detail.join("\n")).toMatch(/fulfillments_tracking_idx/)
  })
})

describe("returns", () => {
  it("satırlar JSON dizi; tür ve durum check'i; bekleyen kuyruğu indeksle", () => {
    const o = s.order()
    const ret = (lines: string, kind = "withdrawal") =>
      s.run(
        `INSERT INTO returns (public_id, order_id, lines, kind, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        `ret_${Math.random()}`,
        o,
        lines,
        kind,
        NOW,
        NOW,
      )
    const r = ret('[{"order_line_id":1,"quantity":1,"restockable":true}]')
    expect(() => ret("{}")).toThrow(/returns_lines_ck/)
    expect(() => ret("[]", "exchange")).toThrow(/returns_kind_ck/)
    expect(db.prepare("SELECT state FROM returns WHERE id = ?").pluck().get(r)).toBe("requested")
    const detail = s.plan(
      "SELECT id FROM returns WHERE state = 'requested' ORDER BY created_at LIMIT 50",
    )
    expect(detail.join("\n")).toMatch(/returns_state_idx/)
    expect(detail.join("\n")).not.toMatch(/TEMP B-TREE/)
  })
})

describe("digital_entitlements", () => {
  it("son indirme hakkı bir kez; token özeti benzersiz", () => {
    const l = s.orderLine(s.order())
    const grant = (hash: string) =>
      s.run(
        `INSERT INTO digital_entitlements (public_id, order_line_id, media_id, token_hash,
           expires_at, download_limit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        `ent_${hash}`,
        l,
        s.media(),
        hash,
        NOW + 1000,
        NOW,
        NOW,
      )
    const e = grant("h1")
    expect(() => grant("h1")).toThrow(/UNIQUE constraint failed/)
    const consume = db.prepare(
      `UPDATE digital_entitlements SET downloads = downloads + 1
       WHERE id = ? AND downloads < download_limit AND revoked_at IS NULL AND expires_at > ?`,
    )
    expect(consume.run(e, NOW).changes).toBe(1)
    expect(consume.run(e, NOW).changes).toBe(0)
  })
})
