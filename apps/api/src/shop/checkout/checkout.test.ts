import { afterEach, describe, expect, it } from "vitest"
import {
  commerceHarness,
  guestPurchase,
  type Harness,
  paidEvent,
  signedIn,
  WEBHOOK_SECRET,
} from "./testHarness"

const closers: (() => void)[] = []
afterEach(() => {
  for (const close of closers.splice(0)) close()
})

const orders = (h: Harness) => h.one<number>("SELECT count(*) FROM orders")

describe("shop checkout", () => {
  it("guest purchase: one order with totals and number, reachable with the otk_ token", async () => {
    const h = await commerceHarness(closers)
    const c = h.client()
    const cart = await c.call("shop/cart/addLine", { variant: h.variant, quantity: 2 })
    expect(cart.status).toBe(200)
    expect(cart.res.headers.get("cache-control")).toBe("no-store")
    expect(cart.json.cart.totals.gross).toBe(2000)
    const r = await c.call(
      "shop/checkout/reserve",
      { paymentMethod: "card", email: "guest@example.com" },
      { "idempotency-key": "guest-key-0001" },
    )
    expect(r.status).toBe(200)
    expect(r.json.next).toMatchObject({ kind: "redirect" })
    const ok = await h.webhook(
      "card",
      await h.fake.request(paidEvent(r.json.reservation, 2000), WEBHOOK_SECRET),
    )
    expect(ok.status).toBe(200)
    const back = await c.call("shop/checkout/return", { reservation: r.json.reservation })
    expect(back.json).toMatchObject({
      status: "placed",
      guestToken: expect.stringMatching(/^otk_/),
    })
    expect(orders(h)).toBe(1)
    const view = await h.client().call("shop/orders/guest", { token: back.json.guestToken })
    expect(view.status).toBe(200)
    expect(view.json.order).toMatchObject({
      id: back.json.order.id,
      number: back.json.order.number,
      totalGross: 2000,
      paymentStatus: "paid",
    })
    expect(view.json.order.number).toMatch(/\d/)
    expect(h.one<number>("SELECT count(*) FROM customers WHERE email = 'guest@example.com'")).toBe(
      1,
    )
  })

  it("signed-in purchase with a confirm-to-place method lists only own orders", async () => {
    const h = await commerceHarness(closers)
    const jane = await signedIn(h, "jane@example.com")
    await jane.call("shop/cart/addLine", { variant: h.variant, quantity: 1 })
    const r = await jane.call(
      "shop/checkout/reserve",
      { paymentMethod: "cod" },
      { "idempotency-key": "jane-key-0001" },
    )
    expect(r.status).toBe(200)
    expect(r.json).toMatchObject({ next: { kind: "placed" }, guestToken: null })
    expect(orders(h)).toBe(1)
    const list = await jane.call("shop/orders/list", {})
    expect(list.json.items).toHaveLength(1)
    expect(list.json.items[0]).toMatchObject({ id: r.json.order.id, totalGross: 1000 })
    expect((await jane.call("shop/orders/get", { id: r.json.order.id })).status).toBe(200)

    const bob = await signedIn(h, "bob@example.com")
    expect((await bob.call("shop/orders/get", { id: r.json.order.id })).status).toBe(404)
    expect((await bob.call("shop/orders/list", {})).json.items).toEqual([])
    expect((await h.client().call("shop/orders/list", {})).status).toBe(401)
  })

  it("same Idempotency-Key twice returns the same reservation", async () => {
    const h = await commerceHarness(closers)
    const c = h.client()
    await c.call("shop/cart/addLine", { variant: h.variant, quantity: 1 })
    const input = { paymentMethod: "card", email: "g@example.com" }
    const headers = { "idempotency-key": "same-key-0001" }
    const a = await c.call("shop/checkout/reserve", input, headers)
    const b = await c.call("shop/checkout/reserve", input, headers)
    expect(a.status).toBe(200)
    expect(b.json.reservation).toBe(a.json.reservation)
    expect(h.one<number>("SELECT count(*) FROM checkout_reservations")).toBe(1)
    expect((await c.call("shop/checkout/reserve", input)).status).toBe(400)
  })

  it("webhook and return page at the same time give one order", async () => {
    const h = await commerceHarness(closers)
    const c = h.client()
    await c.call("shop/cart/addLine", { variant: h.variant, quantity: 1 })
    const r = await c.call(
      "shop/checkout/reserve",
      { paymentMethod: "card", email: "race@example.com" },
      { "idempotency-key": "race-key-0001" },
    )
    const req = await h.fake.request(paidEvent(r.json.reservation, 1000), WEBHOOK_SECRET)
    const [hook, back] = await Promise.all([
      h.webhook("card", req),
      c.call("shop/checkout/return", { reservation: r.json.reservation }),
      h.webhook("card", req),
    ])
    expect(hook.status).toBe(200)
    expect(back.json.status).toBe("placed")
    expect(orders(h)).toBe(1)
    expect(h.one<number>("SELECT count(*) FROM payments")).toBe(1)
  })

  it("wrong signature is rejected without detail; unknown or disabled method is 404", async () => {
    const h = await commerceHarness(closers)
    const forged = await h.fake.request(paidEvent("rsv_x", 1000), WEBHOOK_SECRET, {
      badSignature: true,
    })
    const bad = await h.webhook("card", forged)
    expect(bad.status).toBe(400)
    expect(await bad.json()).toEqual({
      ok: false,
      code: "INVALID_INPUT",
      requestId: expect.any(String),
    })
    const good = await h.fake.request(paidEvent("rsv_x", 1000), WEBHOOK_SECRET)
    expect((await h.webhook("off", good)).status).toBe(404)
    expect((await h.webhook("nope", good)).status).toBe(404)
    expect(
      (
        await h
          .client()
          .call(
            "shop/checkout/reserve",
            { paymentMethod: "off", email: "x@example.com" },
            { "idempotency-key": "off-key-0001" },
          )
      ).status,
    ).toBe(404)
  })

  it("another customer's cart or reservation is never exposed", async () => {
    const h = await commerceHarness(closers)
    const jane = await signedIn(h, "jane@example.com")
    await jane.call("shop/cart/addLine", { variant: h.variant, quantity: 1 })
    const r = await jane.call(
      "shop/checkout/reserve",
      { paymentMethod: "card" },
      { "idempotency-key": "jane-key-0002" },
    )
    const bob = await signedIn(h, "bob@example.com")
    bob.jar.set("om_c", jane.jar.get("om_c") ?? "")
    expect((await bob.call("shop/cart/get")).json.cart).toBeNull()
    expect(
      (await bob.call("shop/checkout/return", { reservation: r.json.reservation })).status,
    ).toBe(404)
    expect(
      (await h.client().call("shop/checkout/return", { reservation: r.json.reservation })).status,
    ).toBe(404)
  })

  it("guest cart is adopted on sign-in only when the customer has none", async () => {
    const h = await commerceHarness(closers)
    const { c } = await guestPurchase(h)
    expect(orders(h)).toBe(1)
    const g = h.client()
    await g.call("shop/cart/addLine", { variant: h.variant, quantity: 3 })
    const jane = await signedIn(h, "jane@example.com")
    jane.jar.set("om_c", g.jar.get("om_c") ?? "")
    expect((await jane.call("shop/cart/get")).json.cart.lines[0].quantity).toBe(3)
    expect(c.jar.has("om_c")).toBe(true)
  })
})
