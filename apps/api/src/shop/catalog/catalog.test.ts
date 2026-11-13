import {
  createChannelRegistry,
  createDefaultChannel,
  createProduct,
  loadChannels,
  reindexProduct,
} from "@openmers/core"
import { openTestDb } from "@openmers/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../../app"
import { createNodePlatform } from "../../platform/node"
import { openNodeSqlite } from "../../platform/node/sqlite"

const NOW = 1_700_000_000_000
const HOST = "shop.test"

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
  const [channel] = await loadChannels(platform)
  if (!channel) throw new Error("no default channel")
  sqlite.write
    .prepare(
      "INSERT INTO tax_categories (code, name, created_at, updated_at) VALUES ('std', 'std', ?, ?)",
    )
    .run(NOW, NOW)
  const product = await createProduct(
    {
      platform,
      channel,
      lang: "en",
      actor: { type: "admin", id: 1, permissions: new Set(["products:write"]) },
      now: NOW,
      requestId: "req_seed",
    },
    {
      translations: [{ lang: "en", name: "Desk Lamp", slug: "desk-lamp" }],
      variants: [{ sku: "LAMP-1", taxCategoryCode: "std" }],
    },
  )
  await reindexProduct(platform, product.publicId)

  const channels = createChannelRegistry({
    load: () => loadChannels(platform),
    version: async () => 1,
  })
  const app = createApp({ platform, channels, now: () => NOW, authSecret: "x".repeat(40) })
  const call = async (path: string, input: unknown) => {
    const res = await app.request(`http://${HOST}/rpc/shop/catalog/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ json: input }),
    })
    // biome-ignore lint/suspicious/noExplicitAny: test reads nested response fields loosely
    return { status: res.status, json: ((await res.json()) as { json: any }).json }
  }
  return { call, product: product.publicId }
}

describe("shop catalog", () => {
  it("list, search and product page read the read model; unknown slug 404", async () => {
    const h = await harness()
    const list = await h.call("list", {})
    expect(list.status).toBe(200)
    expect(list.json.items).toEqual([
      expect.objectContaining({ product: h.product, slug: "desk-lamp", stockBucket: "out" }),
    ])
    expect(JSON.stringify(list.json)).not.toMatch(/"(variant_)?id":\d/)

    const found = await h.call("search", { q: "lam" })
    expect(found.json.items.map((i: { product: string }) => i.product)).toEqual([h.product])

    const page = await h.call("product", { slug: "desk-lamp" })
    expect(page.status).toBe(200)
    expect(page.json.product).toMatchObject({ product: h.product, name: "Desk Lamp" })
    expect((await h.call("product", { slug: "nope" })).status).toBe(404)
    expect((await h.call("list", { cursor: "garbage" })).status).toBe(400)
  })
})
