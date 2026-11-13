import { createChannelRegistry, createDefaultChannel, loadChannels } from "@openmers/core"
import { openTestDb } from "@openmers/test-utils"
import { hashPassword } from "better-auth/crypto"
import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../../app"
import { createNodePlatform } from "../../platform/node"
import { openNodeSqlite } from "../../platform/node/sqlite"

const NOW = 1_700_000_000_000
const HOST = "shop.test"
const SECRET = "test-auth-secret-0123456789abcdef0123"
const OWNER = { name: "Sahip", email: "sahip@example.com", password: "dogru-parola-123" }

const PRODUCT = {
  translations: [{ lang: "en", name: "T-shirt", slug: "tshirt" }],
  options: [
    {
      code: "size",
      name: "Beden",
      values: [
        { code: "s", name: "S" },
        { code: "m", name: "M" },
      ],
    },
  ],
  variants: [
    { sku: "TS-S", taxCategoryCode: "standard", optionValues: [{ option: "size", value: "s" }] },
    { sku: "TS-M", taxCategoryCode: "standard", optionValues: [{ option: "size", value: "m" }] },
  ],
}

const closers: (() => void)[] = []
afterEach(() => {
  for (const close of closers.splice(0)) close()
})

/** Same pattern as `admin.test.ts`: real SQLite + migrations + default channel. */
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
  const call = (path: string, input?: unknown, cookie?: string) =>
    app.request(`http://${HOST}/rpc/admin/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(input === undefined ? {} : { json: input }),
    })
  const setup = () =>
    sqlite.write
      .prepare(
        "INSERT INTO tax_categories (code, name, created_at, updated_at) VALUES ('standard','Standard',?,?)",
      )
      .run(NOW, NOW)
  return { app, platform, sqlite, call, setup }
}

type H = Awaited<ReturnType<typeof harness>>

const pair = (setCookie: string | undefined) => setCookie?.split(";")[0] ?? ""
const cookieOf = (res: Response) => res.headers.getSetCookie().find((c) => c.startsWith("om_a="))

async function setupAndLogin(h: H): Promise<string> {
  expect((await h.call("setup/create", OWNER)).status).toBe(200)
  const res = await h.call("auth/login", { email: OWNER.email, password: OWNER.password })
  expect(res.status).toBe(200)
  return pair(cookieOf(res))
}

describe("admin product endpoints", () => {
  it("no session 401, no permission 403", async () => {
    const h = await harness()
    // Admin is closed until setup finishes (SETUP_REQUIRED); the no-session check comes afterwards.
    expect((await h.call("setup/create", OWNER)).status).toBe(200)
    expect((await h.call("products/list", {})).status).toBe(401)

    // Second admin without a role: valid session, no `products:read` permission.
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
    expect((await h.call("products/list", {}, cookie)).status).toBe(403)
  })

  it("invalid input returns 400", async () => {
    const h = await harness()
    const cookie = await setupAndLogin(h)
    const empty = await h.call("products/create", { ...PRODUCT, variants: [] }, cookie)
    expect(empty.status).toBe(400)
    const badCursor = await h.call("products/list", { cursor: "" }, cookie)
    expect(badCursor.status).toBe(400)
  })

  it("create → read → list → update → delete flow 200/409/404", async () => {
    const h = await harness()
    const cookie = await setupAndLogin(h)
    h.setup()

    const created = await h.call("products/create", PRODUCT, cookie)
    expect(created.status).toBe(200)
    const body = (await created.json()) as {
      json: { ok: boolean; publicId: string; version: number }
    }
    expect(body.json).toMatchObject({ ok: true, version: 0 })
    const publicId = body.json.publicId
    expect(publicId).toMatch(/^prod_/)

    const got = await h.call("products/get", { publicId }, cookie)
    expect(got.status).toBe(200)
    const detail = (await got.json()) as { json: { variants: unknown[]; publicId: string } }
    expect(detail.json).toMatchObject({ publicId })
    expect(detail.json.variants).toHaveLength(2)
    expect(JSON.stringify(detail)).not.toMatch(/"id":\d/)

    const listed = await h.call("products/list", { limit: 10 }, cookie)
    expect(listed.status).toBe(200)
    expect(await listed.json()).toMatchObject({
      json: { items: [{ publicId, name: "T-shirt", slug: "tshirt" }], nextCursor: null },
    })

    const updated = await h.call(
      "products/update",
      { publicId, version: 0, patch: { robots: "noindex" } },
      cookie,
    )
    expect(updated.status).toBe(200)
    expect(await updated.json()).toMatchObject({ json: { version: 1, ok: true } })

    const conflict = await h.call(
      "products/update",
      { publicId, version: 0, patch: { robots: "index" } },
      cookie,
    )
    expect(conflict.status).toBe(409)

    const removed = await h.call("products/delete", { publicId, version: 1 }, cookie)
    expect(removed.status).toBe(200)
    expect((await h.call("products/get", { publicId }, cookie)).status).toBe(404)
  })

  it("variant endpoints: add → update → refuse to delete the last variant", async () => {
    const h = await harness()
    const cookie = await setupAndLogin(h)
    h.setup()
    const created = (await (
      await h.call(
        "products/create",
        {
          translations: [{ lang: "en", name: "Kalem", slug: "kalem" }],
          variants: [{ sku: "K-1", taxCategoryCode: "standard" }],
        },
        cookie,
      )
    ).json()) as { json: { publicId: string } }
    const productPublicId = created.json.publicId

    const added = await h.call(
      "products/variants/create",
      { productPublicId, variant: { sku: "K-2", taxCategoryCode: "standard" } },
      cookie,
    )
    expect(added.status).toBe(200)
    const variantPublicId = ((await added.json()) as { json: { publicId: string } }).json.publicId

    const patched = await h.call(
      "products/variants/update",
      { publicId: variantPublicId, productPublicId, version: 0, patch: { sku: "K-2B" } },
      cookie,
    )
    expect(patched.status).toBe(200)

    const removed = await h.call(
      "products/variants/remove",
      { publicId: variantPublicId, productPublicId, version: 1 },
      cookie,
    )
    expect(removed.status).toBe(200)

    const detail = (await (
      await h.call("products/get", { publicId: productPublicId }, cookie)
    ).json()) as { json: { variants: { publicId: string }[] } }
    const last = detail.json.variants[0]
    if (!last) throw new Error("kalan varyant yok")
    const refused = await h.call(
      "products/variants/remove",
      { publicId: last.publicId, productPublicId, version: 0 },
      cookie,
    )
    expect(refused.status).toBe(400)
  })
})
