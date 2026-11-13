import type Database from "better-sqlite3"
import { describe, expect, it } from "vitest"
import { expectExactlyOneWinner } from "./race"
import { openTestDb } from "./sqlite"

const loser = (code: string): PromiseRejectedResult => ({
  status: "rejected",
  reason: Object.assign(new Error(code), { code }),
})
const winner = <T>(value: T): PromiseFulfilledResult<T> => ({ status: "fulfilled", value })

describe("expectExactlyOneWinner (fake results)", () => {
  it("passes with one winner and losers on the right code, returns the winner value", () => {
    expect(expectExactlyOneWinner([loser("DUP"), winner(7), loser("DUP")], "DUP")).toBe(7)
  })

  it("fails on two winners", () => {
    expect(() => expectExactlyOneWinner([winner(1), winner(2)], "DUP")).toThrow(/2 kazanan/)
  })

  it("fails on zero winners", () => {
    expect(() => expectExactlyOneWinner([loser("DUP"), loser("DUP")], "DUP")).toThrow(/0 kazanan/)
  })

  it("fails when a loser rejects with another code", () => {
    expect(() => expectExactlyOneWinner([winner(1), loser("OTHER")], "DUP")).toThrow(/OTHER/)
  })
})

const ALREADY = "SETUP_ALREADY_COMPLETED"

/** markSetupCompleted-like: read, await, write. Guarding lives in ON CONFLICT DO NOTHING; the read alone does not protect. */
async function markSetupCompleted(db: Database.Database, now: number): Promise<number> {
  const done = db
    .prepare("SELECT 1 FROM settings WHERE scope = 'global' AND key = 'setup.completed_at'")
    .get()
  await Promise.resolve() // both calls interleave here: each has already read "absent"
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

describe("expectExactlyOneWinner (real: file database, two connections)", () => {
  it("yields exactly one winner in an INSERT ... ON CONFLICT DO NOTHING race", async () => {
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
