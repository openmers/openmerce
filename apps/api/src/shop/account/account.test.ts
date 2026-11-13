import {
  createChannelRegistry,
  createDefaultChannel,
  loadChannels,
  upsertCheckoutCustomer,
} from "@openmers/core"
import { openTestDb } from "@openmers/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../../app"
import { hashSessionToken } from "../../auth/hashedSessions"
import { routeGroup } from "../../middleware/rateLimit"
import { createNodePlatform } from "../../platform/node"
import { openNodeSqlite } from "../../platform/node/sqlite"

const NOW = 1_700_000_000_000
const HOST = "shop.test"
const SECRET = "test-auth-secret-0123456789abcdef0123"
const ADDRESS = { addressLine1: "1 Main St", city: "Springfield", country: "us" }

const closers: (() => void)[] = []
afterEach(() => {
  for (const close of closers.splice(0)) close()
})

async function harness() {
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
  const app = createApp({ platform, channels, now: () => NOW, authSecret: SECRET })
  const call = async (path: string, input?: unknown, cookie?: string) => {
    const res = await app.request(`http://${HOST}/rpc/shop/account/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(input === undefined ? {} : { json: input }),
    })
    const body = (await res.json()) as { json: Record<string, unknown> }
    // biome-ignore lint/suspicious/noExplicitAny: test reads nested response fields loosely
    return { res, status: res.status, json: body.json as Record<string, any> }
  }
  const one = <T>(sql: string, ...params: unknown[]) =>
    sqlite.write
      .prepare(sql)
      .pluck()
      .get(...params) as T
  return { app, platform, sqlite, call, one }
}

type H = Awaited<ReturnType<typeof harness>>

/** Sign-up → verification token from the outbox row → verify → sign-in; returns the `om_s` cookie pair. */
async function register(h: H, email: string, password = "correct-password-1"): Promise<string> {
  expect((await h.call("auth/signUp", { email, password })).status).toBe(200)
  const payload = h.one<string>(
    "SELECT payload FROM outbox WHERE event = 'customer.verification_email' ORDER BY id DESC LIMIT 1",
  )
  const { token } = JSON.parse(payload) as { token: string }
  expect((await h.call("auth/signIn", { email, password })).status).toBe(401)
  expect((await h.call("auth/verifyEmail", { token })).status).toBe(200)
  const signIn = await h.call("auth/signIn", { email, password })
  expect(signIn.status).toBe(200)
  const set = signIn.res.headers.getSetCookie().find((c) => c.startsWith("om_s=")) ?? ""
  expect(set).toMatch(/HttpOnly/i)
  return set.split(";")[0] ?? ""
}

describe("shop account", () => {
  it("guest → sign-up → verify → sign-in keeps a single customer row", async () => {
    const h = await harness()
    const guest = await upsertCheckoutCustomer(
      { platform: h.platform, now: NOW, requestId: "r" },
      { email: "Jane@Example.com", channelId: 1, firstName: "Jane" },
    )
    const cookie = await register(h, "jane@example.com")
    expect(h.one<number>("SELECT count(*) FROM customers")).toBe(1)
    const me = await h.call("me", undefined, cookie)
    expect(me.status).toBe(200)
    expect(me.json.customer).toMatchObject({ id: guest.publicId, firstName: "Jane" })
    expect(me.res.headers.get("cache-control")).toBe("no-store")
    expect(JSON.stringify(me.json)).not.toMatch(/"id":\s*\d/)
    // Only the token hash is stored.
    const token = decodeURIComponent(cookie.slice("om_s=".length)).split(".")[0] ?? ""
    expect(h.one<number>("SELECT count(*) FROM sessions WHERE token = ?", token)).toBe(0)
    expect(
      h.one<number>("SELECT count(*) FROM sessions WHERE token = ?", await hashSessionToken(token)),
    ).toBe(1)
  })

  it("address CRUD with version checks, ownership 404 and no-store", async () => {
    const h = await harness()
    const a = await register(h, "a@example.com")
    const b = await register(h, "b@example.com")
    // Binding the account on verification bumped the customer version once.
    expect((await h.call("me", undefined, a)).json.customer.version).toBe(1)
    const created = await h.call(
      "addresses/create",
      { version: 1, address: ADDRESS, defaultShipping: true },
      a,
    )
    expect(created.status).toBe(200)
    expect(created.json).toMatchObject({ id: expect.stringMatching(/^adr_/), version: 2 })
    const id = created.json.id as string

    const stale = await h.call("addresses/update", { id, version: 1, address: ADDRESS }, a)
    expect(stale.status).toBe(409)
    expect(stale.res.headers.get("cache-control")).toBe("no-store")
    expect(
      (await h.call("addresses/update", { id, version: 2, address: { ...ADDRESS, city: "X" } }, a))
        .json,
    ).toEqual({ version: 3 })

    const foreign = await h.call("addresses/delete", { id, version: 1 }, b)
    expect(foreign.status).toBe(404)
    expect(foreign.res.headers.get("cache-control")).toBe("no-store")
    expect((await h.call("addresses/list", undefined, b)).json.items).toEqual([])

    const list = await h.call("addresses/list", undefined, a)
    expect(list.json).toMatchObject({
      version: 3,
      items: [{ id, city: "X", country: "US", isDefaultShipping: true }],
    })
    expect(
      (await h.call("addresses/setDefault", { id, version: 3, kind: "billing" }, a)).json,
    ).toEqual({ version: 4 })
    expect((await h.call("addresses/delete", { id, version: 4 }, a)).json).toEqual({ version: 5 })
    expect((await h.call("addresses/list", undefined, a)).json).toEqual({ version: 5, items: [] })
  })

  it("account endpoints without a session are 401; admin cookie is ignored; auth routes are rate limited", async () => {
    const h = await harness()
    expect((await h.call("me")).status).toBe(401)
    expect((await h.call("me", undefined, "om_a=forged.sig")).status).toBe(401)
    expect((await h.call("me", undefined, "om_s=forged.sig")).status).toBe(401)
    expect(routeGroup("/rpc/shop/account/auth/signIn")).toBe("login")
    expect(routeGroup("/rpc/shop/account/auth/signUp")).toBe("login")
  })

  it("wrong password and unknown email get the same response; sign-out ends the session", async () => {
    const h = await harness()
    const cookie = await register(h, "c@example.com")
    const wrong = await h.call("auth/signIn", {
      email: "c@example.com",
      password: "wrong-password-1",
    })
    const missing = await h.call("auth/signIn", {
      email: "x@example.com",
      password: "wrong-password-1",
    })
    expect(wrong.status).toBe(401)
    expect(JSON.stringify(missing.json)).toBe(JSON.stringify(wrong.json))
    expect((await h.call("auth/signOut", undefined, cookie)).status).toBe(200)
    expect((await h.call("me", undefined, cookie)).status).toBe(401)
  })
})
