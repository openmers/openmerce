import {
  type ChannelRegistry,
  createChannelRegistry,
  createDefaultChannel,
  loadChannels,
} from "@openmers/core"
import { openTestDb } from "@openmers/test-utils"
import type { Hono } from "hono"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createApp } from "./app"
import type { AppEnv } from "./http/env"
import { createNodePlatform, type NodePlatform } from "./platform/node"
import { type NodeSqlite, openNodeSqlite } from "./platform/node/sqlite"

const NOW = 1_700_000_000_000
const HOST = "shop.test"
const PUBLIC_ID = "chn_0000000001"

type Harness = {
  app: Hono<AppEnv>
  platform: NodePlatform
  sqlite: NodeSqlite
  close(): void
}

/** Real SQLite + real migrations + `createDefaultChannel` seed; no driver mocks. */
async function harness(over: { channels?: Pick<ChannelRegistry, "get"> } = {}): Promise<Harness> {
  const file = openTestDb({ file: true })
  const sqlite = openNodeSqlite(file.path)
  const platform = createNodePlatform({ sqlite, now: () => NOW, kek: "test-kek" })
  await createDefaultChannel(platform, { publicId: PUBLIC_ID, code: "main", domain: HOST }, NOW)

  const channels =
    over.channels ??
    createChannelRegistry({ load: () => loadChannels(platform), version: async () => 1 })

  const app = createApp({
    platform,
    channels,
    now: () => NOW,
    // HTTPS off: tests use HTTP; HSTS must not be written.
    https: false,
    requestId: () => "req_test",
    authSecret: "test-auth-secret-0123456789abcdef0123",
  })

  return {
    app,
    platform,
    sqlite,
    close() {
      file.close()
    },
  }
}

function expectSecurityHeaders(res: Response): void {
  expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff")
  expect(res.headers.get("X-Frame-Options")).toBe("DENY")
  expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin")
  expect(res.headers.get("Permissions-Policy")).toContain("camera=()")
  expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'none'")
  expect(res.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'")
  expect(res.headers.get("Strict-Transport-Security")).toBeNull()
}

describe("API shell", () => {
  let h: Harness

  beforeEach(async () => {
    h = await harness()
  })

  afterEach(() => {
    h.platform.close()
    h.close()
  })

  it("GET /api/health returns 200 and the code of the channel resolved for the request", async () => {
    const res = await h.app.request(`http://${HOST}/api/health`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, channel: "main" })
  })

  it("x-openmers-channel with an unknown key returns 404", async () => {
    const res = await h.app.request(`http://${HOST}/api/health`, {
      headers: { "x-openmers-channel": "yok" },
    })
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ ok: false, code: "CHANNEL_UNKNOWN" })
  })

  it("unknown Host returns 404; the 404 response carries security headers, no HSTS over HTTP", async () => {
    const res = await h.app.request("http://bilinmeyen.test/api/health")
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({
      ok: false,
      code: "CHANNEL_UNKNOWN",
      requestId: "req_test",
    })
    expectSecurityHeaders(res)

    const notFound = await h.app.request(`http://${HOST}/boyle-bir-yol-yok`)
    expect(notFound.status).toBe(404)
    expectSecurityHeaders(notFound)
  })

  it("500 response does not leak the internal message and carries security headers", async () => {
    const broken = await harness({
      channels: {
        get: async () => {
          throw new Error("iç ayrıntı: gizli-anahtar")
        },
      },
    })
    try {
      const res = await broken.app.request(`http://${HOST}/api/health`)
      expect(res.status).toBe(500)
      const text = await res.text()
      expect(text).not.toContain("gizli-anahtar")
      expect(JSON.parse(text)).toEqual({ ok: false, code: "INTERNAL", requestId: "req_test" })
      expectSecurityHeaders(res)
    } finally {
      broken.platform.close()
      broken.close()
    }
  })

  it("GET is rejected on /rpc, POST works", async () => {
    const get = await h.app.request(`http://${HOST}/rpc/shop/health`)
    expect(get.status).toBeGreaterThanOrEqual(400)

    const post = await h.app.request(`http://${HOST}/rpc/shop/health`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    })
    expect(post.status).toBe(200)
    // RPC envelope: output comes back inside `{ json: ... }` (the typed client unwraps it).
    expect(await post.json()).toEqual({ json: { ok: true, channel: "main" } })
  })

  it("/api/openapi.json contains the health path as GET", async () => {
    const res = await h.app.request(`http://${HOST}/api/openapi.json`)
    expect(res.status).toBe(200)
    const doc = (await res.json()) as { paths: Record<string, Record<string, unknown>> }
    expect(doc.paths["/health"]?.get).toBeDefined()
  })
})
