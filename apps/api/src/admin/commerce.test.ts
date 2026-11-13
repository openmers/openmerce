import { createChannelRegistry, createDefaultChannel, loadChannels } from "@openmers/core"
import { openTestDb } from "@openmers/test-utils"
import { hashPassword } from "better-auth/crypto"
import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app"
import { createNodePlatform } from "../platform/node"
import { openNodeSqlite } from "../platform/node/sqlite"

// Fiyat + stok admin uçları; düzen `products/products.test.ts` ile aynı (gerçek SQLite + HTTP).

const NOW = 1_700_000_000_000
const HOST = "shop.test"
const SECRET = "test-auth-secret-0123456789abcdef0123"
const OWNER = { name: "Sahip", email: "sahip@example.com", password: "dogru-parola-123" }

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
  await createDefaultChannel(platform, { publicId: "chn_main", code: "main", domain: HOST }, NOW)
  const channels = createChannelRegistry({
    load: () => loadChannels(platform),
    version: async () => 1,
  })
  const app = createApp({ platform, channels, now: () => NOW, authSecret: SECRET })
  const call = (path: string, input: unknown, cookie?: string) =>
    app.request(`http://${HOST}/rpc/admin/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ json: input }),
    })
  return { sqlite, call }
}

type H = Awaited<ReturnType<typeof harness>>

const pair = (res: Response) =>
  res.headers
    .getSetCookie()
    .find((c) => c.startsWith("om_a="))
    ?.split(";")[0] ?? ""

async function login(h: H, email: string, password: string): Promise<string> {
  const res = await h.call("auth/login", { email, password })
  expect(res.status).toBe(200)
  return pair(res)
}

async function owner(h: H): Promise<string> {
  expect((await h.call("setup/create", OWNER)).status).toBe(200)
  return login(h, OWNER.email, OWNER.password)
}

const json = async (res: Response) => ((await res.json()) as { json: unknown }).json

describe("admin fiyat ve stok uçları", () => {
  it("oturumsuz 401, izinsiz 403", async () => {
    const h = await harness()
    expect((await h.call("setup/create", OWNER)).status).toBe(200)
    for (const path of ["priceLists/list", "prices/get", "stock/locations/list"]) {
      expect((await h.call(path, {})).status, path).toBe(401)
    }
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
    const cookie = await login(h, "r@example.com", "rolsuz-parola-1")
    expect((await h.call("priceLists/list", {}, cookie)).status).toBe(403)
    expect(
      (await h.call("prices/set", { priceListPublicId: "pl_x", items: [] }, cookie)).status,
    ).toBe(403)
    expect((await h.call("stock/levels/adjust", {}, cookie)).status).toBe(403)
  })

  it("geçersiz girdi 400", async () => {
    const h = await harness()
    const cookie = await owner(h)
    const list = { name: "Base", currency: "usd", type: "base", includesTax: true }
    expect((await h.call("priceLists/create", list, cookie)).status).toBe(400)
    const set = { priceListPublicId: "pl_x", items: [] }
    expect((await h.call("prices/set", set, cookie)).status).toBe(400)
    const many = Array.from({ length: 501 }, () => ({ variantPublicId: "var_x", amount: 1 }))
    expect((await h.call("prices/set", { ...set, items: many }, cookie)).status).toBe(400)
    const float = [{ variantPublicId: "var_x", amount: 1.5 }]
    expect((await h.call("prices/set", { ...set, items: float }, cookie)).status).toBe(400)
    const adjust = { variantPublicId: "var_x", locationPublicId: "loc_x", delta: 0 }
    expect((await h.call("stock/levels/adjust", adjust, cookie)).status).toBe(400)
  })

  it("liste → fiyat → depo → stok akışı 200; base silme 409; negatif stok 400", async () => {
    const h = await harness()
    const cookie = await owner(h)
    h.sqlite.write
      .prepare(
        "INSERT INTO tax_categories (code, name, created_at, updated_at) VALUES ('standard','S',?,?)",
      )
      .run(NOW, NOW)
    const product = (await json(
      await h.call(
        "products/create",
        {
          translations: [{ lang: "en", name: "Kalem", slug: "kalem" }],
          variants: [{ sku: "K-1", taxCategoryCode: "standard" }],
        },
        cookie,
      ),
    )) as { publicId: string }
    const detail = (await json(await h.call("products/get", product, cookie))) as {
      variants: { publicId: string }[]
    }
    const variant = detail.variants[0]?.publicId as string

    const listRes = await h.call(
      "priceLists/create",
      { name: "Base", currency: "USD", type: "base", includesTax: true },
      cookie,
    )
    expect(listRes.status).toBe(200)
    const list = (await json(listRes)) as { publicId: string }
    const set = await h.call(
      "prices/set",
      { priceListPublicId: list.publicId, items: [{ variantPublicId: variant, amount: 1999 }] },
      cookie,
    )
    expect(set.status).toBe(200)
    expect(await json(set)).toEqual([
      { ok: true, index: 0, value: { variantPublicId: variant, minQty: 1 } },
    ])
    const prices = await h.call("prices/get", { variantPublicIds: [variant] }, cookie)
    expect(await json(prices)).toMatchObject([
      { priceList: list.publicId, amount: 1999, currency: "USD" },
    ])
    expect((await h.call("priceLists/delete", list, cookie)).status).toBe(409)

    const locRes = await h.call(
      "stock/locations/create",
      { name: "Depo", channelPriority: 0 },
      cookie,
    )
    expect(locRes.status).toBe(200)
    const loc = (await json(locRes)) as { publicId: string }
    const locations = await json(await h.call("stock/locations/list", {}, cookie))
    expect(locations).toMatchObject([{ publicId: loc.publicId, channelPriority: 0 }])
    const adjust = { variantPublicId: variant, locationPublicId: loc.publicId, delta: 5 }
    expect((await h.call("stock/levels/adjust", adjust, cookie)).status).toBe(200)
    expect((await h.call("stock/levels/adjust", { ...adjust, delta: -6 }, cookie)).status).toBe(400)
    const levels = await json(
      await h.call("stock/levels/get", { variantPublicId: variant }, cookie),
    )
    expect(levels).toEqual([
      { location: loc.publicId, onHand: 5, reserved: 0, safety: 0, available: 5, version: 1 },
    ])
    const missing = { ...adjust, variantPublicId: "var_yok" }
    expect((await h.call("stock/levels/adjust", missing, cookie)).status).toBe(404)
  })
})
