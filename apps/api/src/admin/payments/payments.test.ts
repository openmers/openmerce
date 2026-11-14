import { afterEach, describe, expect, it } from "vitest"
import { admin, commerceHarness, paidEvent, WEBHOOK_SECRET } from "../../shop/checkout/testHarness"

const closers: (() => void)[] = []
afterEach(() => {
  for (const close of closers.splice(0)) close()
})

describe("admin payments", () => {
  it("confirming a bank transfer twice settles one order and audits once", async () => {
    const h = await commerceHarness(closers)
    const c = h.client()
    await c.call("shop/cart/addLine", { variant: h.variant, quantity: 2 })
    const r = await c.call(
      "shop/checkout/reserve",
      { paymentMethod: "bank", email: "bank@example.com" },
      { "idempotency-key": "bank-key-0001" },
    )
    const reservation = r.json.reservation as string
    const a = await admin(h)
    const first = await a.call("admin/payments/confirmTransfer", { reservation })
    expect(first.status).toBe(200)
    expect(first.json.created).toBe(true)
    const second = await a.call("admin/payments/confirmTransfer", { reservation })
    expect(second.json).toEqual({ ...first.json, created: false })
    expect(h.one<number>("SELECT count(*) FROM orders")).toBe(1)
    expect(h.one<string>("SELECT state FROM payments")).toBe("settled")
    expect(h.one<number>("SELECT amount FROM payments")).toBe(2000)
    expect(
      h.one<number>("SELECT count(*) FROM audit_log WHERE action = 'payments:confirm_transfer'"),
    ).toBe(1)
    expect((await h.client().call("admin/payments/confirmTransfer", { reservation })).status).toBe(
      401,
    )
  })

  it("a card reservation cannot be confirmed as a transfer", async () => {
    const h = await commerceHarness(closers)
    const c = h.client()
    await c.call("shop/cart/addLine", { variant: h.variant, quantity: 1 })
    const r = await c.call(
      "shop/checkout/reserve",
      { paymentMethod: "card", email: "card@example.com" },
      { "idempotency-key": "card-key-0001" },
    )
    const a = await admin(h)
    const res = await a.call("admin/payments/confirmTransfer", { reservation: r.json.reservation })
    expect(res.status).toBe(409)
    expect(h.one<number>("SELECT count(*) FROM orders")).toBe(0)
  })

  it("captures an authorized card payment through the handler", async () => {
    const h = await commerceHarness(closers)
    const c = h.client()
    await c.call("shop/cart/addLine", { variant: h.variant, quantity: 1 })
    const r = await c.call(
      "shop/checkout/reserve",
      { paymentMethod: "card", email: "auth@example.com" },
      { "idempotency-key": "auth-key-0001" },
    )
    const rsv = r.json.reservation as string
    const event = { ...paidEvent(rsv, 1000), captured: false }
    await h.webhook("card", await h.fake.request(event, WEBHOOK_SECRET))
    const payment = h.one<string>("SELECT public_id FROM payments")
    expect(h.one<string>("SELECT state FROM payments")).toBe("authorized")

    const a = await admin(h)
    const res = await a.call("admin/payments/capture", { id: payment })
    expect(res.json).toEqual({ ok: true, state: "settled" })
    expect(h.fake.captureCalls).toEqual([{ reference: rsv, amount: 1000 }])
    expect(h.one<string>("SELECT state FROM payments")).toBe("settled")
    expect((await a.call("admin/payments/capture", { id: payment })).status).toBe(400)
    expect(h.one<number>("SELECT count(*) FROM audit_log WHERE action = 'payments:capture'")).toBe(
      1,
    )
  })
})
