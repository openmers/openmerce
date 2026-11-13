import { adminProcedure } from "@openmers/contract"
import { buildCtx, createChannelRegistry, createDefaultChannel, loadChannels } from "@openmers/core"
import { openTestDb } from "@openmers/test-utils"
import { hashPassword } from "better-auth/crypto"
import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"
import { createApp } from "../app"
import { createAdminAuth } from "../auth/adminAuth"
import { hashSessionToken } from "../auth/hashedSessions"
import { routeGroup } from "../middleware/rateLimit"
import { requirePermission } from "../orpc/requirePermission"
import { createNodePlatform } from "../platform/node"
import { openNodeSqlite } from "../platform/node/sqlite"

const NOW = 1_700_000_000_000
const HOST = "shop.test"
const SECRET = "test-auth-secret-0123456789abcdef0123"
const OWNER = { name: "Sahip", email: "sahip@example.com", password: "dogru-parola-123" }

const closers: (() => void)[] = []
afterEach(() => {
  for (const close of closers.splice(0)) close()
})

/** `app.test.ts` kalıbı: gerçek SQLite + migration + varsayılan kanal. */
async function harness(https = false) {
  const file = openTestDb({ file: true })
  const sqlite = openNodeSqlite(file.path)
  const platform = createNodePlatform({ sqlite, now: () => NOW, kek: "test-kek" })
  closers.push(() => {
    platform.close()
    file.close()
  })
  await createDefaultChannel(
    platform,
    { publicId: "chn_0000000001", code: "main", domain: HOST },
    NOW,
  )
  const channels = createChannelRegistry({
    load: () => loadChannels(platform),
    version: async () => 1,
  })
  const app = createApp({ platform, channels, now: () => NOW, https, authSecret: SECRET })
  const scheme = https ? "https" : "http"
  const call = (path: string, input?: unknown, cookie?: string) =>
    app.request(`${scheme}://${HOST}/rpc/admin/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(input === undefined ? {} : { json: input }),
    })
  return { app, platform, sqlite, call }
}

type H = Awaited<ReturnType<typeof harness>>

const cookieOf = (res: Response) => res.headers.getSetCookie().find((c) => c.startsWith("om_a="))
const pair = (setCookie: string | undefined) => setCookie?.split(";")[0] ?? ""
const tokenOf = (cookie: string) =>
  decodeURIComponent(cookie.slice("om_a=".length)).split(".")[0] ?? ""

async function setupAndLogin(h: H): Promise<string> {
  expect((await h.call("setup/create", OWNER)).status).toBe(200)
  const res = await h.call("auth/login", { email: OWNER.email, password: OWNER.password })
  expect(res.status).toBe(200)
  return pair(cookieOf(res))
}

describe("admin kimlik doğrulama", () => {
  it("kurulumdan önce yalnız kurulum açık; kurulumdan sonra kurulum kilitli", async () => {
    const h = await harness()
    const me = await h.call("me")
    expect(me.status).toBe(403)
    expect(await me.json()).toMatchObject({ json: { code: "SETUP_REQUIRED" } })
    expect(
      (await h.call("auth/login", { email: OWNER.email, password: "x".repeat(8) })).status,
    ).toBe(403)

    const setup = await h.call("setup/create", OWNER)
    expect(setup.status).toBe(200)
    expect(await setup.json()).toMatchObject({
      json: { ok: true, adminId: expect.stringMatching(/^adm_/) },
    })
    const again = await h.call("setup/create", { ...OWNER, email: "ikinci@example.com" })
    expect(again.status).toBe(409)
    expect(await again.json()).toMatchObject({ json: { code: "SETUP_DONE" } })
  })

  it("kurulum → giriş → admin.me 200; çerez HttpOnly + SameSite, HTTP'de Secure yok", async () => {
    const h = await harness()
    expect((await h.call("setup/create", OWNER)).status).toBe(200)
    const login = await h.call("auth/login", { email: OWNER.email, password: OWNER.password })
    const set = cookieOf(login) ?? ""
    expect(set).toMatch(/HttpOnly/i)
    expect(set).toMatch(/SameSite=Lax/i)
    expect(set).not.toMatch(/Secure/i)

    const me = await h.call("me", undefined, pair(set))
    expect(me.status).toBe(200)
    const body = (await me.json()) as {
      json: { admin: { id: string; email: string }; permissions: string[] }
    }
    expect(body.json.admin).toMatchObject({
      email: OWNER.email,
      id: expect.stringMatching(/^adm_/),
    })
    expect(body.json.permissions).toContain("settings:write")
    expect(JSON.stringify(body)).not.toMatch(/"id":\s*\d/)
  })

  it("HTTPS'te çerez Secure taşır", async () => {
    const h = await harness(true)
    expect((await h.call("setup/create", OWNER)).status).toBe(200)
    const login = await h.call("auth/login", { email: OWNER.email, password: OWNER.password })
    expect(cookieOf(login)).toMatch(/;\s*Secure/i)
  })

  it("yanlış parola ve olmayan e-posta aynı yanıt", async () => {
    const h = await harness()
    expect((await h.call("setup/create", OWNER)).status).toBe(200)
    const wrong = await h.call("auth/login", { email: OWNER.email, password: "yanlis-parola-1" })
    const missing = await h.call("auth/login", {
      email: "yok@example.com",
      password: "yanlis-parola-1",
    })
    expect(wrong.status).toBe(401)
    expect(missing.status).toBe(wrong.status)
    expect(await missing.text()).toBe(await wrong.text())
    expect(cookieOf(wrong)).toBeUndefined()
    expect(routeGroup("/rpc/admin/auth/login")).toBe("login")
  })

  it("oturumsuz ve sahte çerezli admin.me 401", async () => {
    const h = await harness()
    expect((await h.call("setup/create", OWNER)).status).toBe(200)
    expect((await h.call("me")).status).toBe(401)
    expect((await h.call("me", undefined, "om_a=uydurma.imza")).status).toBe(401)
  })

  it("veritabanında yalnız token özeti; çalınan satırla oturum bulunmaz", async () => {
    const h = await harness()
    const cookie = await setupAndLogin(h)
    const token = tokenOf(cookie)
    const rows = h.sqlite.write
      .prepare("SELECT token FROM admin_sessions")
      .pluck()
      .all() as string[]
    expect(rows).toHaveLength(1)
    expect(rows[0]).not.toContain(token)
    expect(rows[0]).toBe(await hashSessionToken(token))

    // Sır bilinse bile satırdaki değer token değildir: Better Auth onu arar, bulamaz.
    const auth = createAdminAuth({ db: h.platform.db, secret: SECRET })
    const internal = (await auth.$context).internalAdapter
    expect(await internal.findSession(rows[0] ?? "")).toBeNull()
    expect(await internal.findSession(token)).not.toBeNull()
  })

  it("çıkıştan sonra token geçersiz, satır silinir", async () => {
    const h = await harness()
    const cookie = await setupAndLogin(h)
    const out = await h.call("auth/logout", undefined, cookie)
    expect(out.status).toBe(200)
    expect(cookieOf(out)).toMatch(/Max-Age=0/i)
    expect((await h.call("me", undefined, cookie)).status).toBe(401)
    expect(h.sqlite.write.prepare("SELECT count(*) FROM admin_sessions").pluck().get()).toBe(0)
  })

  it("CSRF: admin POST'ta yabancı Origin'li form isteği 403", async () => {
    const h = await harness()
    const res = await h.app.request(`http://${HOST}/rpc/admin/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://saldirgan.test",
      },
      body: "email=a",
    })
    expect(res.status).toBe(403)
  })

  it("izni olmayan prosedür 403, meta'sız prosedür 403", async () => {
    const h = await harness()
    expect((await h.call("setup/create", OWNER)).status).toBe(200)
    // Rolsüz ikinci yönetici: oturumu geçerli, izni yok.
    const w = h.sqlite.write
    const id = w
      .prepare(
        `INSERT INTO admin_users (public_id, name, email, status, created_at, updated_at)
         VALUES ('adm_rolsuz00001', 'R', 'r@example.com', 'active', ?, ?)`,
      )
      .run(NOW, NOW).lastInsertRowid
    w.prepare(
      `INSERT INTO admin_accounts (admin_user_id, provider_id, account_id, password, created_at, updated_at)
       VALUES (?, 'credential', ?, ?, ?, ?)`,
    ).run(id, String(id), await hashPassword("rolsuz-parola-1"), NOW, NOW)
    const login = await h.call("auth/login", {
      email: "r@example.com",
      password: "rolsuz-parola-1",
    })
    const cookie = pair(cookieOf(login))
    expect((await h.call("me", undefined, cookie)).status).toBe(200)

    const auth = createAdminAuth({ db: h.platform.db, secret: SECRET })
    const snapshot = await createChannelRegistry({
      load: () => loadChannels(h.platform),
      version: async () => 1,
    }).get(NOW)
    const context = {
      platform: h.platform,
      snapshot,
      api: "admin" as const,
      host: HOST,
      channelHeader: null,
      now: NOW,
      requestId: "req",
      adminAuth: auth,
      reqHeaders: new Headers({ cookie }),
      https: false,
    }
    const built = buildCtx({ ...context })
    if (built.kind !== "ctx") throw new Error("ctx yok")
    const guard = (procedure: { "~orpc": { meta: Record<PropertyKey, unknown> } }) =>
      requirePermission({ context, ctx: built.ctx, path: ["admin", "orders", "list"], procedure })

    const needsOrders = adminProcedure("orders:read").output(z.object({}))
    await expect(guard(needsOrders)).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(guard({ "~orpc": { meta: {} } })).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(guard(adminProcedure("session").output(z.object({})))).resolves.toMatchObject({
      actor: { type: "admin" },
    })
  })
})
