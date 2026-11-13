// Test-only harness for the commerce API tests (real SQLite + HTTP through `app.request`).
import {
  adjustStock,
  type Ctx,
  createChannelRegistry,
  createDefaultChannel,
  createLocation,
  createPriceList,
  createProduct,
  getProduct,
  linkLocationToChannel,
  loadChannels,
  setPrices,
} from "@openmers/core"
import { fakePaymentHandler, openTestDb } from "@openmers/test-utils"
import { createApp } from "../../app"
import { createCommerceConfig } from "../../commerce/config"
import { createNodePlatform } from "../../platform/node"
import { openNodeSqlite } from "../../platform/node/sqlite"

export const NOW = 1_700_000_000_000
export const HOST = "shop.test"
export const WEBHOOK_SECRET = "whsec_test"
const AUTH_SECRET = "test-auth-secret-0123456789abcdef0123"

// biome-ignore lint/suspicious/noExplicitAny: tests read nested response fields loosely
export type Json = Record<string, any>

export async function commerceHarness(closers: (() => void)[]) {
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
  if (!channel) throw new Error("no channel")
  const run = (sql: string, ...args: unknown[]) =>
    Number(sqlite.write.prepare(sql).run(...args).lastInsertRowid)
  const one = <T>(sql: string, ...args: unknown[]) =>
    sqlite.write
      .prepare(sql)
      .pluck()
      .get(...args) as T

  // catalog: one digital variant (no shipping step), 5 in stock, 1000 USD tax exclusive
  run(
    "INSERT INTO tax_categories (code, name, created_at, updated_at) VALUES ('standard', 'S', ?, ?)",
    NOW,
    NOW,
  )
  const ctx: Ctx = {
    platform,
    api: "admin",
    channel,
    lang: "en",
    currency: "USD",
    priceListIds: [],
    segment: "admin",
    actor: { type: "admin", id: 1, permissions: new Set() },
    now: NOW,
    requestId: "seed",
  }
  const product = await createProduct(ctx, {
    translations: [{ lang: "en", name: "Pen", slug: "pen" }],
    variants: [{ sku: "PEN-1", taxCategoryCode: "standard" }],
  })
  const variant = (await getProduct(ctx, product.publicId))?.variants[0]?.publicId ?? ""
  run("UPDATE product_variants SET fulfillment_type = 'digital'")
  const location = await createLocation(ctx, { name: "Main", countryCode: "US" })
  await linkLocationToChannel(ctx, { locationPublicId: location.publicId, priority: 0 })
  await adjustStock(ctx, {
    variantPublicId: variant,
    locationPublicId: location.publicId,
    delta: 5,
  })
  const list = await createPriceList(ctx, {
    name: "Base",
    currency: "USD",
    type: "base",
    includesTax: false,
  })
  await setPrices(ctx, {
    priceListPublicId: list.publicId,
    items: [{ variantPublicId: variant, amount: 1000 }],
  })

  let position = 0
  const method = (code: string, handler: string, args: object, enabled = 1) => {
    const id = run(
      `INSERT INTO payment_methods (code, name, position, handler_code, handler_args, enabled,
         created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      code,
      code,
      position++,
      handler,
      JSON.stringify(args),
      enabled,
      NOW,
      NOW,
    )
    run(
      "INSERT INTO payment_method_channels (payment_method_id, channel_id, created_at) VALUES (?, ?, ?)",
      id,
      channel.id,
      NOW,
    )
  }
  method("card", "fake", { secret: WEBHOOK_SECRET })
  method("cod", "cashOnDelivery", {})
  method("bank", "bankTransfer", {
    accountName: "Shop",
    iban: "DE89370400440532013000",
    expiresInHours: 1,
  })
  method("off", "fake", { secret: WEBHOOK_SECRET }, 0)

  const fake = fakePaymentHandler()
  const handlers = { fake: fake.handler }
  const commerce = createCommerceConfig({ platform, handlers })
  const channels = createChannelRegistry({
    load: () => loadChannels(platform),
    version: async () => 1,
  })
  const clock = { now: NOW }
  const app = createApp({
    platform,
    channels,
    commerce,
    now: () => clock.now,
    authSecret: AUTH_SECRET,
    log: () => {},
  })

  /** Browser-like cookie jar: keeps the last `om_c` / `om_s` / `om_a` values per client. */
  const client = (initial: Record<string, string> = {}) => {
    const jar = new Map(Object.entries(initial))
    const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ")
    const call = async (path: string, input?: unknown, headers: Record<string, string> = {}) => {
      const res = await app.request(`http://${HOST}/rpc/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: cookie(), ...headers },
        body: JSON.stringify(input === undefined ? {} : { json: input }),
      })
      for (const c of res.headers.getSetCookie()) {
        const [pair = ""] = c.split(";")
        const eq = pair.indexOf("=")
        jar.set(pair.slice(0, eq), pair.slice(eq + 1))
      }
      const body = (await res.json()) as { json?: Json } & Json
      return { res, status: res.status, json: (body.json ?? body) as Json }
    }
    return { call, jar }
  }

  const webhook = async (
    code: string,
    req: { body: string; headers: { get(n: string): string | null } },
  ) =>
    app.request(`http://${HOST}/hooks/payments/${code}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-fake-signature": req.headers.get("x-fake-signature") ?? "",
      },
      body: req.body,
    })

  return { app, platform, sqlite, run, one, variant, fake, commerce, clock, client, webhook }
}

export type Harness = Awaited<ReturnType<typeof commerceHarness>>

let n = 0
export const paidEvent = (reservationPublicId: string, amount: number) => ({
  kind: "paid",
  eventId: `evt_${++n}`,
  reservationPublicId,
  reference: reservationPublicId,
  amount,
  currency: "USD",
  captured: true,
})

/** Sign-up → verification token from the outbox → verify → sign-in; the client keeps `om_s`. */
export async function signedIn(h: Harness, email: string) {
  const c = h.client()
  const password = "correct-password-1"
  await c.call("shop/account/auth/signUp", { email, password })
  const payload = h.one<string>(
    "SELECT payload FROM outbox WHERE event = 'customer.verification_email' ORDER BY id DESC LIMIT 1",
  )
  await c.call("shop/account/auth/verifyEmail", { token: (JSON.parse(payload) as Json).token })
  const r = await c.call("shop/account/auth/signIn", { email, password })
  if (r.status !== 200 || !c.jar.has("om_s")) throw new Error(`sign-in failed: ${r.status}`)
  return c
}

/** First owner (super admin) via setup, then login; the client keeps `om_a`. */
export async function admin(h: Harness) {
  const c = h.client()
  const owner = { name: "Owner", email: "owner@example.com", password: "owner-password-123" }
  await c.call("admin/setup/create", owner)
  const r = await c.call("admin/auth/login", { email: owner.email, password: owner.password })
  if (r.status !== 200 || !c.jar.has("om_a")) throw new Error(`admin login failed: ${r.status}`)
  return c
}

/** Guest buys `qty` with the fake card; the webhook settles. Returns the order and the client. */
export async function guestPurchase(h: Harness, qty = 1, email = "guest@example.com") {
  const c = h.client()
  await c.call("shop/cart/addLine", { variant: h.variant, quantity: qty })
  const r = await c.call(
    "shop/checkout/reserve",
    { paymentMethod: "card", email },
    { "idempotency-key": `key-${++n}-guest` },
  )
  const rsv = r.json.reservation as string
  await h.webhook("card", await h.fake.request(paidEvent(rsv, qty * 1000), WEBHOOK_SECRET))
  const back = await c.call("shop/checkout/return", { reservation: rsv })
  return { c, rsv, order: back.json.order as { id: string; number: string } }
}
