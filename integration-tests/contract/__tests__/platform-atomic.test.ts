import type { AtomicStatement } from "@openmers/core"
import { settings } from "@openmers/db"
import { expectExactlyOneWinner, openTestDb, type TestDbFile } from "@openmers/test-utils"
import type Database from "better-sqlite3"
import { and, eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { nodeAtomic } from "../../../apps/api/src/platform/node/atomic"
import { openNodeSqlite } from "../../../apps/api/src/platform/node/sqlite"

// Platform `atomic()` sözleşmesi (01-platform-arayuzu §1). Hedef: SQLite; D1 (Miniflare) sonra.
// İfadeler Drizzle `toSQL()` ile üretilir: kararlaştırılan AtomicStatement biçimi.

const qb = (conn: Database.Database) => drizzle(conn)

const insertSetting = (conn: Database.Database, key: string, value: unknown): AtomicStatement =>
  qb(conn)
    .insert(settings)
    .values({ scope: "global", key, value, createdAt: 0, updatedAt: 0 })
    .toSQL()

/** Değer `from` ise `to` yap: koşullu yazma, "kazandım mı" satır sayısından okunur. */
const swapSetting = (conn: Database.Database, key: string, from: unknown, to: unknown) =>
  qb(conn)
    .update(settings)
    .set({ value: to })
    .where(and(eq(settings.key, key), eq(settings.value, from)))
    .toSQL()

const settingValue = (conn: Database.Database, key: string) =>
  qb(conn).select().from(settings).where(eq(settings.key, key)).get()?.value

describe("[sqlite] platform atomic()", () => {
  let conn: Database.Database
  beforeEach(() => {
    conn = openTestDb()
  })
  afterEach(() => conn.close())

  it("ikinci ifade hata verince ilk ifadenin yazdığı satır kalmaz", async () => {
    const atomic = nodeAtomic(conn)
    // boş anahtar settings_key_ck'yi bozar
    await expect(
      atomic([insertSetting(conn, "a", 1), insertSetting(conn, "", 2)]),
    ).rejects.toThrow()
    expect(settingValue(conn, "a")).toBeUndefined()
  })

  it("koşulu tutmayan ifade 0 döner; dönüş uzunluğu ifade sayısına eşit", async () => {
    const atomic = nodeAtomic(conn)
    const result = await atomic([
      insertSetting(conn, "k", "a"),
      swapSetting(conn, "k", "a", "b"),
      swapSetting(conn, "k", "a", "c"),
    ])
    expect(result).toEqual([1, 1, 0])
    expect(settingValue(conn, "k")).toBe("b")
  })

  it("boş ifade dizisi boş sonuç döner", async () => {
    expect(await nodeAtomic(conn)([])).toEqual([])
  })
})

describe("[sqlite] platform atomic() iki bağlantı yarışı", () => {
  let file: TestDbFile
  beforeEach(() => {
    file = openTestDb({ file: true })
  })
  afterEach(() => file.close())

  it("aynı koşullu UPDATE'te tam bir kazanan", async () => {
    const [c1, c2] = [file.connect(), file.connect()]
    await nodeAtomic(c1)([insertSetting(c1, "token", "t0")])

    const claim = async (conn: Database.Database, to: string) => {
      const [n] = await nodeAtomic(conn)([swapSetting(conn, "token", "t0", to)])
      if (n !== 1) throw Object.assign(new Error("kaybetti"), { code: "CONFLICT" })
      return to
    }
    const winner = expectExactlyOneWinner(
      await Promise.allSettled([claim(c1, "w1"), claim(c2, "w2")]),
      "CONFLICT",
    )
    expect(settingValue(c2, "token")).toBe(winner)
  })
})

describe("[sqlite] openNodeSqlite", () => {
  it("WAL + pragmalar; salt-okunur bağlantı yazılanı görür, yazamaz", async () => {
    const file = openTestDb({ file: true })
    const sqlite = openNodeSqlite(file.path)
    try {
      expect(sqlite.write.pragma("journal_mode", { simple: true })).toBe("wal")
      expect(sqlite.write.pragma("synchronous", { simple: true })).toBe(1) // NORMAL
      expect(sqlite.write.pragma("foreign_keys", { simple: true })).toBe(1)
      expect(sqlite.read.pragma("busy_timeout", { simple: true })).toBe(5000)

      await nodeAtomic(sqlite.write)([insertSetting(sqlite.write, "r", "x")])
      expect(settingValue(sqlite.read, "r")).toBe("x")
      expect(() => sqlite.read.exec("DELETE FROM settings")).toThrow(/readonly/)
    } finally {
      sqlite.close()
      file.close()
    }
  })
})
