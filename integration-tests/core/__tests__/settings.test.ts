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
const global = { scope: "global", scopeId: 0 } as const

describeOnTargets("settings sorguları", (getDb) => {
  const platform = () => testPlatform(getDb())

  it("getSettings iki kapsamı tek sorguda döner, başka kanalı karıştırmaz", async () => {
    const p = platform()
    await setSetting(p, { ...global, key: "store.name", value: "G" }, NOW)
    await setSetting(p, { scope: "channel", scopeId: 5, key: "store.name", value: "K5" }, NOW)
    await setSetting(p, { scope: "channel", scopeId: 6, key: "store.name", value: "K6" }, NOW)

    const rows = await getSettings(p.db, [global, { scope: "channel", scopeId: 5 }])
    expect(
      rows
        .filter((r) => r.key === "store.name")
        .map((r) => r.value)
        .sort(),
    ).toEqual(["G", "K5"])
    expect(rows.some((r) => r.scopeId === 6)).toBe(false)
  })

  it("boş kapsam listesi sorgu atmadan boş döner; okuma indeks kullanır", async () => {
    const p = platform()
    expect(await getSettings(p.db, [])).toEqual([])
    await setSetting(p, { ...global, key: "store.name", value: "G" }, NOW)
    assertNoFullScan(
      getDb(),
      getSettingsQuery(p.db, [global, { scope: "channel", scopeId: 5 }]).toSQL(),
    )
  })

  it("getSettingsVersion satır yokken 0", async () => {
    expect(await getSettingsVersion(platform().db)).toBe(0)
  })

  it("her yazımda sürüm tam 1 artar; aynı anahtar tek satırda kalır", async () => {
    const p = platform()
    await setSetting(p, { ...global, key: "store.name", value: "A" }, NOW)
    expect(await getSettingsVersion(p.db)).toBe(1)
    await setSetting(p, { ...global, key: "store.name", value: "B" }, NOW + 1)
    expect(await getSettingsVersion(p.db)).toBe(2)
    expect(scalar<number>(getDb(), "SELECT count(*) FROM settings WHERE key = 'store.name'")).toBe(
      1,
    )
    expect(scalar<string>(getDb(), "SELECT value FROM settings WHERE key = 'store.name'")).toBe(
      '"B"',
    )
  })

  it("geçersiz değer, bilinmeyen anahtar, sır gibi anahtar ve izinsiz kapsam reddedilir", async () => {
    const p = platform()
    await expect(
      setSetting(p, { ...global, key: "audit.retention_days", value: 0 }, NOW),
    ).rejects.toMatchObject({ code: "INVALID_SETTING" })
    await expect(
      setSetting(p, { ...global, key: "nope.key", value: 1 }, NOW),
    ).rejects.toMatchObject({ code: "UNKNOWN_SETTING" })
    await expect(
      setSetting(p, { ...global, key: "smtp.password", value: "x" }, NOW),
    ).rejects.toMatchObject({ code: "SECRET_KEY" })
    await expect(
      setSetting(p, { scope: "channel", scopeId: 5, key: "audit.retention_days", value: 30 }, NOW),
    ).rejects.toMatchObject({ code: "SCOPE_NOT_ALLOWED" })
    // iç sayaç: kimse yazmaz
    await expect(
      setSetting(p, { ...global, key: "settings.version", value: 9 }, NOW),
    ).rejects.toMatchObject({ code: "SCOPE_NOT_ALLOWED" })
    expect(await getSettingsVersion(p.db)).toBe(0)
  })

  it("global kapsamda scope_id ≠ 0 DB check'iyle reddedilir", async () => {
    await expect(
      setSetting(platform(), { scope: "global", scopeId: 7, key: "store.name", value: "X" }, NOW),
    ).rejects.toThrow(/settings_scope_id_ck/)
  })

  it("markSetupCompleted bir kez yazar; ilk değer korunur", async () => {
    const p = platform()
    expect(await markSetupCompleted(p, 111)).toBe(1)
    expect(await markSetupCompleted(p, 222)).toBe(0)
    expect(
      scalar<string>(getDb(), "SELECT value FROM settings WHERE key = 'setup.completed_at'"),
    ).toBe("111")
  })
})

// İki bağlantı ancak dosya veritabanında anlamlı; bu yüzden describeOnTargets dışında.
describe("[sqlite] iki bağlantılı dosya modu", () => {
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

  it("markSetupCompleted yarışı: tam bir kazanan, değer onunki kalır", async () => {
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

  it("iki eşzamanlı setSetting sonrası sürüm 2 artar", async () => {
    const [c1, c2] = twoConnections()
    await Promise.all([
      setSetting(testPlatform(c1), { ...global, key: "store.name", value: "A" }, NOW),
      setSetting(testPlatform(c2), { ...global, key: "audit.retention_days", value: 30 }, NOW),
    ])
    expect(await getSettingsVersion(testPlatform(c1).db)).toBe(2)
  })
})
