import { openTestDb } from "@openmers/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { sqlitePlatform } from "../../__testing__/sqlitePlatform"
import { loadAdminActor } from "../session/loadAdminActor"
import { createFirstAdmin } from "./createFirstAdmin"
import { getSetupCompletedAt } from "./getSetupCompletedAt"

const NOW = 1_700_000_000_000
const input = (email: string) => ({ name: "Sahip", email, passwordHash: "salt:hash" })

const closers: (() => void)[] = []
afterEach(() => {
  for (const close of closers.splice(0)) close()
})

function twoConnections() {
  const file = openTestDb({ file: true })
  closers.push(() => file.close())
  const a = file.connect()
  return [sqlitePlatform(a), sqlitePlatform(file.connect()), a] as const
}

const count = (conn: ReturnType<typeof twoConnections>[2], table: string) =>
  conn.prepare(`SELECT count(*) FROM ${table}`).pluck().get()

describe("createFirstAdmin", () => {
  it("yönetici + SuperAdmin ataması + kurulum kilidi + denetim tek seferde; ikinci çağrı reddedilir", async () => {
    const [p, , conn] = twoConnections()
    const first = await createFirstAdmin(p, input("Sahip@Example.com"), NOW)
    expect(first).toMatchObject({ ok: true })
    expect(first.ok && first.adminId).toMatch(/^adm_/)
    expect(await getSetupCompletedAt(p)).toBe(NOW)

    const second = await createFirstAdmin(p, input("baska@example.com"), NOW + 1)
    expect(second).toEqual({ ok: false, code: "SETUP_DONE" })
    expect(count(conn, "admin_users")).toBe(1)
    expect(count(conn, "admin_accounts")).toBe(1)
    expect(count(conn, "audit_log")).toBe(1)

    const actor = await loadAdminActor(p, { adminUserId: 1, sessionVersion: 0, channelId: 1 })
    expect(actor?.email).toBe("sahip@example.com")
    expect(actor?.permissions.has("settings:write")).toBe(true)
  })

  it("yarış: iki bağlantıdan eşzamanlı iki kurulum, tam bir kazanan", async () => {
    const [a, b, conn] = twoConnections()
    const results = await Promise.all([
      createFirstAdmin(a, input("a@example.com"), NOW),
      createFirstAdmin(b, input("b@example.com"), NOW),
    ])
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, code: "SETUP_DONE" }])
    expect(count(conn, "admin_users")).toBe(1)
    expect(count(conn, "admin_role_assignments")).toBe(1)
  })

  it("askıdaki ya da sürümü eskimiş oturumun aktörü yok", async () => {
    const [p] = twoConnections()
    await createFirstAdmin(p, input("x@example.com"), NOW)
    expect(await loadAdminActor(p, { adminUserId: 1, sessionVersion: 1, channelId: 1 })).toBeNull()
    expect(await loadAdminActor(p, { adminUserId: 99, sessionVersion: 0, channelId: 1 })).toBeNull()
  })
})
