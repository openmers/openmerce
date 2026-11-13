import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { NOW, seeder } from "../testing/commerce"
import { openMigratedDb } from "../testing/sqlite"

// 0017_commerce-links: kanal bağlantıları ve sipariş numarası sayacı. Gerçek SQLite.
let db: Database.Database
let s: ReturnType<typeof seeder>
beforeEach(() => {
  db = openMigratedDb()
  s = seeder(db)
})
afterEach(() => db.close())

const promotion = () =>
  s.run(
    `INSERT INTO promotions (public_id, name, enabled, priority, conditions, actions, stackable,
       created_at, updated_at) VALUES (?, 'x', 1, 0, '[]', '[]', 0, ?, ?)`,
    `prm_${Math.random()}`,
    NOW,
    NOW,
  )

const nextNumber = (channelId: number, period: number) =>
  db
    .prepare(
      `INSERT INTO order_number_counters (channel_id, period, last_value, updated_at)
       VALUES (?, ?, 1, ?)
       ON CONFLICT (channel_id, period) DO UPDATE SET last_value = last_value + 1, updated_at = excluded.updated_at
       RETURNING last_value`,
    )
    .pluck()
    .get(channelId, period, NOW) as number

describe("promotion_channels", () => {
  it("aynı bağlantı iki kez yazılamaz, olmayan kanal reddedilir", () => {
    const p = promotion()
    const c = s.channel()
    const link = (channelId: number) =>
      s.run(
        "INSERT INTO promotion_channels (promotion_id, channel_id, created_at) VALUES (?, ?, ?)",
        p,
        channelId,
        NOW,
      )
    link(c)
    expect(() => link(c)).toThrow(/UNIQUE|PRIMARY KEY/)
    expect(() => link(9999)).toThrow(/FOREIGN KEY/)
  })

  it("kanaldan promosyona arama ters indeksi kullanır", () => {
    const detail = s.plan("SELECT promotion_id FROM promotion_channels WHERE channel_id = ?", 1)
    expect(detail.join(" ")).toMatch(/promotion_channels_channel_idx/)
  })
})

describe("order_number_counters", () => {
  it("kanal + dönem başına boşluksuz artar, kanallar birbirini etkilemez", () => {
    const a = s.channel()
    const b = s.channel()
    expect([nextNumber(a, 2026), nextNumber(a, 2026), nextNumber(a, 2026)]).toEqual([1, 2, 3])
    expect(nextNumber(b, 2026)).toBe(1)
    expect(nextNumber(a, 2027)).toBe(1)
  })
})
