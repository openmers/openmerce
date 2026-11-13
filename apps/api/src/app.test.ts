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

/** Gerçek SQLite + gerçek migration'lar + `createDefaultChannel` tohumu; sürücü taklidi yok. */
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
    // HTTPS kapalı: testte HTTP; HSTS yazılmamalı.
    https: false,
    requestId: () => "req_test",
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

describe("API kabuğu", () => {
  let h: Harness

  beforeEach(async () => {
    h = await harness()
  })

  afterEach(() => {
    h.platform.close()
    h.close()
  })

  it("GET /api/health 200 döner ve istekte çözülen kanalın kodunu verir", async () => {
    const res = await h.app.request(`http://${HOST}/api/health`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, channel: "main" })
  })

  it("x-openmers-channel bilinmeyen anahtarı 404 eder", async () => {
    const res = await h.app.request(`http://${HOST}/api/health`, {
      headers: { "x-openmers-channel": "yok" },
    })
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ ok: false, code: "CHANNEL_UNKNOWN" })
  })

  it("bilinmeyen Host 404 döner; 404 yanıtı güvenlik başlıklarını taşır, HTTP'de HSTS yok", async () => {
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

  it("500 yanıtı iç iletiyi sızdırmaz ve güvenlik başlıklarını taşır", async () => {
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

  it("/rpc üzerinde GET reddedilir, POST çalışır", async () => {
    const get = await h.app.request(`http://${HOST}/rpc/shop/health`)
    expect(get.status).toBeGreaterThanOrEqual(400)

    const post = await h.app.request(`http://${HOST}/rpc/shop/health`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    })
    expect(post.status).toBe(200)
    // RPC zarfı: çıktı `{ json: ... }` içinde döner (tipli istemci bunu çözer).
    expect(await post.json()).toEqual({ json: { ok: true, channel: "main" } })
  })

  it("/api/openapi.json health yolunu GET olarak içerir", async () => {
    const res = await h.app.request(`http://${HOST}/api/openapi.json`)
    expect(res.status).toBe(200)
    const doc = (await res.json()) as { paths: Record<string, Record<string, unknown>> }
    expect(doc.paths["/health"]?.get).toBeDefined()
  })
})
