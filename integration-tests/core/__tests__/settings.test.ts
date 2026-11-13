import {
  assertNoFullScan,
  describeOnTargets,
  expectExactlyOneWinner,
  openTestDb,
  type TestDbFile,
} from "@openmers/test-utils"
import type Database from "better-sqlite3"
import { afterEach, describe, expect, it } from "vitest"
import {
  getSettings,
  getSettingsVersion,
  markSetupCompleted,
  setSetting,
} from "../../../packages/core/src/features/settings"
import { getSettingsQuery } from "../../../packages/core/src/features/settings/queries/getSettings"
import { scalar, testPlatform } from "./helpers"

const NOW = 1_700_000_000_000
const ACTOR = { type: "admin", id: 1 } as const
const global = { scope: "global", scopeId: 0 } as const

describeOnTargets("settings queries", (getDb) => {
  const platform = () => testPlatform(getDb())

  it("getSettings returns two scopes in one query and does not mix in another channel", async () => {
    const p = platform()
    await setSetting(p, { ...global, key: "store.name", value: "G" }, NOW, ACTOR)
    await setSetting(
      p,
      { scope: "channel", scopeId: 5, key: "store.name", value: "K5" },
      NOW,
      ACTOR,
    )
    await setSetting(
      p,
      { scope: "channel", scopeId: 6, key: "store.name", value: "K6" },
      NOW,
      ACTOR,
    )

    const rows = await getSettings(p.db, [global, { scope: "channel", scopeId: 5 }])
    expect(
      rows
        .filter((r) => r.key === "store.name")
        .map((r) => r.value)
        .sort(),
    ).toEqual(["G", "K5"])
    expect(rows.some((r) => r.scopeId === 6)).toBe(false)
  })

  it("an empty scope list returns empty without querying; the read uses an index", async () => {
    const p = platform()
    expect(await getSettings(p.db, [])).toEqual([])
    await setSetting(p, { ...global, key: "store.name", value: "G" }, NOW, ACTOR)
    assertNoFullScan(
      getDb(),
      getSettingsQuery(p.db, [global, { scope: "channel", scopeId: 5 }]).toSQL(),
    )
  })

  it("getSettingsVersion is 0 when there are no rows", async () => {
    expect(await getSettingsVersion(platform().db)).toBe(0)
  })

  it("each write bumps the version by exactly 1; the same key stays in one row", async () => {
    const p = platform()
    await setSetting(p, { ...global, key: "store.name", value: "A" }, NOW, ACTOR)
    expect(await getSettingsVersion(p.db)).toBe(1)
    await setSetting(p, { ...global, key: "store.name", value: "B" }, NOW + 1, ACTOR)
    expect(await getSettingsVersion(p.db)).toBe(2)
    expect(scalar<number>(getDb(), "SELECT count(*) FROM settings WHERE key = 'store.name'")).toBe(
      1,
    )
    expect(scalar<string>(getDb(), "SELECT value FROM settings WHERE key = 'store.name'")).toBe(
      '"B"',
    )
  })

  it("invalid value, unknown key, secret-like key and unauthorized scope are rejected", async () => {
    const p = platform()
    await expect(
      setSetting(p, { ...global, key: "audit.retention_days", value: 0 }, NOW, ACTOR),
    ).rejects.toMatchObject({ code: "INVALID_SETTING" })
    await expect(
      setSetting(p, { ...global, key: "nope.key", value: 1 }, NOW, ACTOR),
    ).rejects.toMatchObject({ code: "UNKNOWN_SETTING" })
    await expect(
      setSetting(p, { ...global, key: "smtp.password", value: "x" }, NOW, ACTOR),
    ).rejects.toMatchObject({ code: "SECRET_KEY" })
    await expect(
      setSetting(
        p,
        { scope: "channel", scopeId: 5, key: "audit.retention_days", value: 30 },
        NOW,
        ACTOR,
      ),
    ).rejects.toMatchObject({ code: "SCOPE_NOT_ALLOWED" })
    // internal counter: nobody writes it
    await expect(
      setSetting(p, { ...global, key: "settings.version", value: 9 }, NOW, ACTOR),
    ).rejects.toMatchObject({ code: "SCOPE_NOT_ALLOWED" })
    expect(await getSettingsVersion(p.db)).toBe(0)
  })

  it("global scope with scope_id ≠ 0 is rejected by the DB check", async () => {
    await expect(
      setSetting(
        platform(),
        { scope: "global", scopeId: 7, key: "store.name", value: "X" },
        NOW,
        ACTOR,
      ),
    ).rejects.toThrow(/settings_scope_id_ck/)
  })

  it("the audit row is in the same atomic; if the settings write fails there is no audit row", async () => {
    const p = platform()
    await setSetting(p, { ...global, key: "store.name", value: "G" }, NOW, ACTOR)
    expect(
      scalar<number>(getDb(), "SELECT count(*) FROM audit_log WHERE action = 'settings:write'"),
    ).toBe(1)
    expect(
      scalar<string>(getDb(), "SELECT after FROM audit_log WHERE action = 'settings:write'"),
    ).toBe(JSON.stringify({ scope: "global", scopeId: 0, key: "store.name", value: "G" }))

    await expect(
      setSetting(p, { scope: "global", scopeId: 7, key: "store.name", value: "X" }, NOW, ACTOR),
    ).rejects.toThrow(/settings_scope_id_ck/)
    expect(
      scalar<number>(getDb(), "SELECT count(*) FROM audit_log WHERE action = 'settings:write'"),
    ).toBe(1)
  })

  it("markSetupCompleted writes once; the first value is kept", async () => {
    const p = platform()
    expect(await markSetupCompleted(p, 111)).toBe(1)
    expect(await markSetupCompleted(p, 222)).toBe(0)
    expect(
      scalar<string>(getDb(), "SELECT value FROM settings WHERE key = 'setup.completed_at'"),
    ).toBe("111")
  })
})

// Two connections only make sense with a file database; hence outside describeOnTargets.
describe("[sqlite] two-connection file mode", () => {
  let file: TestDbFile | undefined
  afterEach(() => {
    file?.close()
    file = undefined
  })

  const twoConnections = (): [Database.Database, Database.Database] => {
    file = openTestDb({ file: true })
    const c1 = file.connect()
    const c2 = file.connect()
    c1.pragma("busy_timeout = 5000")
    c2.pragma("busy_timeout = 5000")
    return [c1, c2]
  }

  it("markSetupCompleted race: exactly one winner, its value stays", async () => {
    const [c1, c2] = twoConnections()
    const claim = async (conn: Database.Database, now: number) => {
      const n = await markSetupCompleted(testPlatform(conn), now)
      if (n !== 1) throw Object.assign(new Error("kurulum zaten bitmiş"), { code: "SETUP_DONE" })
      return now
    }
    const winner = expectExactlyOneWinner(
      await Promise.allSettled([claim(c1, 111), claim(c2, 222)]),
      "SETUP_DONE",
    )
    expect(
      Number(scalar<string>(c2, "SELECT value FROM settings WHERE key = 'setup.completed_at'")),
    ).toBe(winner)
    expect(
      scalar<number>(c2, "SELECT count(*) FROM settings WHERE key = 'setup.completed_at'"),
    ).toBe(1)
  })

  it("after two concurrent setSetting calls the version goes up by 2", async () => {
    const [c1, c2] = twoConnections()
    await Promise.all([
      setSetting(testPlatform(c1), { ...global, key: "store.name", value: "A" }, NOW, ACTOR),
      setSetting(
        testPlatform(c2),
        { ...global, key: "audit.retention_days", value: 30 },
        NOW,
        ACTOR,
      ),
    ])
    expect(await getSettingsVersion(testPlatform(c1).db)).toBe(2)
  })
})
