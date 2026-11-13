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

/** `app.test.ts` kalıbı: gerçek SQLite + migration + varsayılan kanal; yalnız `rateLimit` değişir. */
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
  it("yanlış ya da eksik Origin'li form POST 403, güvenlik başlıklarıyla", async () => {
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

  it("doğru Origin'li form POST, JSON ve imzalı webhook yolu geçer", async () => {
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

describe("hız sınırı", () => {
  it("aşımda 429 + Retry-After; kova kanal + rota grubu + istemci", async () => {
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

  it("sınırlayıcı çökerse istek geçer ve hata loglanır (fail-open)", async () => {
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
