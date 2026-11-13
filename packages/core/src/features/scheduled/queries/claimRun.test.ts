import { scheduledRuns } from "@openmers/db"
import { describeOnTargets, expectExactlyOneWinner, openTestDb } from "@openmers/test-utils"
import type Database from "better-sqlite3"
import { describe, expect, it } from "vitest"
import { sqlitePlatform } from "../../__testing__/sqlitePlatform"
import { claimRun } from "./claimRun"

const NOW = 1_700_000_000_000
const PERIOD = Math.floor(NOW / 300_000) * 300_000

describeOnTargets("scheduled_runs sahiplenme", (getDb) => {
  const platform = () => sqlitePlatform(getDb())

  it("aynı dönem ikinci kez sahiplenilemez; farklı dönem alınır", async () => {
    const p = platform()
    expect(await claimRun(p, { task: "outbox.sweep", period: PERIOD, now: NOW })).toBe(true)
    expect(await claimRun(p, { task: "outbox.sweep", period: PERIOD, now: NOW })).toBe(false)
    expect(await claimRun(p, { task: "outbox.sweep", period: PERIOD + 300_000, now: NOW })).toBe(
      true,
    )
    expect(await p.db.select().from(scheduledRuns)).toHaveLength(2)
    expect((await p.db.select().from(scheduledRuns))[0]).toMatchObject({
      status: "running",
      startedAt: NOW,
    })
  })
})

describe("[sqlite] scheduled_runs iki bağlantılı dosya modu", () => {
  it("aynı dönem için iki süreçten tam biri kazanır", async () => {
    const file = openTestDb({ file: true })
    try {
      const conns: Database.Database[] = [file.connect(), file.connect()]
      for (const conn of conns) conn.pragma("busy_timeout = 5000")

      const claim = async (conn: Database.Database) => {
        const won = await claimRun(sqlitePlatform(conn), {
          task: "outbox.sweep",
          period: PERIOD,
          now: NOW + conns.indexOf(conn),
        })
        if (!won) throw Object.assign(new Error("dönem zaten çalışıyor"), { code: "RUN_TAKEN" })
        return NOW
      }
      expectExactlyOneWinner(
        await Promise.allSettled(conns.map((conn) => claim(conn))),
        "RUN_TAKEN",
      )
      expect(conns[0]?.prepare("SELECT count(*) FROM scheduled_runs").pluck().get()).toBe(1)
    } finally {
      file.close()
    }
  })
})
