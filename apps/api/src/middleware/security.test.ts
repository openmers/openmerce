import {
  createChannelRegistry,
  createDefaultChannel,
  loadChannels,
  type RateLimit,
} from "@openmers/core"
import { openTestDb } from "@openmers/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app"
import { createNodePlatform } from "../platform/node"
import { openNodeSqlite } from "../platform/node/sqlite"

const NOW = 1_700_000_000_000
const HOST = "shop.test"
const URL_RPC = `http://${HOST}/rpc/shop/health`

const closers: (() => void)[] = []
afterEach(() => {
  for (const close of closers.splice(0)) close()
})

/** Same pattern as `app.test.ts`: real SQLite + migrations + default channel; only `rateLimit` differs. */
async function harness(limit?: RateLimit, log?: (m: string, e: unknown) => void) {
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
  return createApp({
    platform: limit ? { ...platform, rateLimit: limit } : platform,
    channels,
    now: () => NOW,
    https: false,
    requestId: () => "req_test",
    authSecret: "test-auth-secret-0123456789abcdef0123",
    log,
  })
}

const form = (origin?: string): RequestInit => ({
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    ...(origin ? { origin } : {}),
  },
  body: "a=1",
})

describe("CSRF Origin", () => {
  it("form POST with a wrong or missing Origin returns 403 with security headers", async () => {
    const app = await harness()
    const res = await app.request(URL_RPC, form("https://saldirgan.test"))
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ ok: false, code: "FORBIDDEN" })
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect((await app.request(URL_RPC, form())).status).toBe(403)
    const multipart = await app.request(URL_RPC, {
      method: "POST",
      headers: { "content-type": "text/plain;charset=UTF-8", origin: "https://saldirgan.test" },
      body: "{}",
    })
    expect(multipart.status).toBe(403)
  })

  it("form POST with the right Origin, JSON and the signed webhook path pass", async () => {
    const app = await harness()
    expect((await app.request(URL_RPC, form(`https://${HOST}`))).status).not.toBe(403)
    const json = await app.request(URL_RPC, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://saldirgan.test" },
      body: "{}",
    })
    expect(json.status).toBe(200)
    const hook = await app.request(`http://${HOST}/hooks/stripe`, form("https://stripe.test"))
    expect(hook.status).not.toBe(403)
  })
})

describe("rate limiting", () => {
  it("429 + Retry-After when exceeded; bucket is channel + route group + client", async () => {
    const keys: string[] = []
    const app = await harness(async (key) => {
      keys.push(key)
      return { ok: false, retryAfter: 30 }
    })
    const res = await app.request(`http://${HOST}/api/health`, {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    })
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("30")
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(await res.json()).toMatchObject({ ok: false, code: "RATE_LIMITED" })
    expect(keys).toEqual(["main:api:203.0.113.7"])
  })

  it("if the limiter crashes the request passes and the error is logged (fail-open)", async () => {
    const logged: unknown[] = []
    const app = await harness(
      async () => {
        throw new Error("binding yok")
      },
      (_m, e) => logged.push(e),
    )
    const res = await app.request(`http://${HOST}/api/health`)
    expect(res.status).toBe(200)
    expect(logged).toHaveLength(1)
  })
})
