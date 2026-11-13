import type Database from "better-sqlite3"
import { describe, expect, it } from "vitest"
import { expectExactlyOneWinner } from "./race"
import { openTestDb } from "./sqlite"

const loser = (code: string): PromiseRejectedResult => ({
  status: "rejected",
  reason: Object.assign(new Error(code), { code }),
})
const winner = <T>(value: T): PromiseFulfilledResult<T> => ({ status: "fulfilled", value })

describe("expectExactlyOneWinner (sahte sonuç)", () => {
  it("tam bir kazanan ve doğru kodlu kaybedenle geçer, kazananın değerini döner", () => {
    expect(expectExactlyOneWinner([loser("DUP"), winner(7), loser("DUP")], "DUP")).toBe(7)
  })

  it("iki kazananda kırılır", () => {
    expect(() => expectExactlyOneWinner([winner(1), winner(2)], "DUP")).toThrow(/2 kazanan/)
  })

  it("sıfır kazananda kırılır", () => {
    expect(() => expectExactlyOneWinner([loser("DUP"), loser("DUP")], "DUP")).toThrow(/0 kazanan/)
  })

  it("kaybeden başka kodla dönerse kırılır", () => {
    expect(() => expectExactlyOneWinner([winner(1), loser("OTHER")], "DUP")).toThrow(/OTHER/)
  })
})

const ALREADY = "SETUP_ALREADY_COMPLETED"

/** markSetupCompleted benzeri: oku, await, yaz. Koşul ON CONFLICT DO NOTHING'de; okuma tek başına korumaz. */
async function markSetupCompleted(db: Database.Database, now: number): Promise<number> {
  const done = db
    .prepare("SELECT 1 FROM settings WHERE scope = 'global' AND key = 'setup.completed_at'")
    .get()
  await Promise.resolve() // iki çağrı burada iç içe geçer: ikisi de "yok" okumuş olur
  if (done) throw Object.assign(new Error("kurulum tamam"), { code: ALREADY })
  const { changes } = db
    .prepare(
      `INSERT INTO settings (scope, scope_id, key, value, created_at, updated_at)
       VALUES ('global', 0, 'setup.completed_at', ?, ?, ?)
       ON CONFLICT (scope, scope_id, key) DO NOTHING`,
    )
    .run(String(now), now, now)
  if (changes === 0) throw Object.assign(new Error("kurulum tamam"), { code: ALREADY })
  return now
}

describe("expectExactlyOneWinner (gerçek: dosya veritabanı, iki bağlantı)", () => {
  it("INSERT ... ON CONFLICT DO NOTHING yarışında tam bir kazanan", async () => {
    const file = openTestDb({ file: true })
    try {
      const [a, b] = [file.connect(), file.connect()]
      const results = await Promise.allSettled([markSetupCompleted(a, 1), markSetupCompleted(b, 2)])
      expectExactlyOneWinner(results, ALREADY)

      const rows = file
        .connect()
        .prepare("SELECT count(*) FROM settings WHERE key = 'setup.completed_at'")
        .pluck()
        .get()
      expect(rows).toBe(1)
    } finally {
      file.close()
    }
  })
})
