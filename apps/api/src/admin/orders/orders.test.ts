import { listOrdersQuery, runMaintenanceOnce } from "@openmers/core"
import { assertNoFullScan } from "@openmers/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { admin, commerceHarness, guestPurchase, NOW } from "../../shop/checkout/testHarness"

const closers: (() => void)[] = []
afterEach(() => {
  for (const close of closers.splice(0)) close()
})

describe("admin orders and payments", () => {
  it("lists and gets orders; a refund can never exceed the payment", async () => {
    const h = await commerceHarness(closers)
    const { order } = await guestPurchase(h)
    const a = await admin(h)
    const list = await a.call("admin/orders/list", {})
    expect(list.status).toBe(200)
    expect(list.json.items.map((o: { id: string }) => o.id)).toEqual([order.id])
    const got = await a.call("admin/orders/get", { id: order.id })
    const payment = got.json.order.payments[0].id as string
    expect(got.json.order.payments[0]).toMatchObject({ amount: 1000, state: "settled" })

    const refund = (amount: number, key: string) =>
      a.call("admin/payments/refund", { id: payment, amount, idempotencyKey: key })
    expect((await refund(600, "refund-key-1")).json).toMatchObject({ state: "settled" })
    const over = await refund(500, "refund-key-2")
    expect(over.status).toBe(409)
    expect(over.json.code).toBe("REFUND_EXCEEDS")
    expect(h.fake.refundCalls.map((c) => c.amount)).toEqual([600])
    expect(h.one<number>("SELECT count(*) FROM audit_log WHERE action = 'payments:refund'")).toBe(1)
    expect((await h.client().call("admin/orders/get", { id: order.id })).status).toBe(401)
  })

  it("cancels an unfulfilled order: stock returns and the payment is refunded", async () => {
    const h = await commerceHarness(closers)
    const { order } = await guestPurchase(h, 2)
    const a = await admin(h)
    const r = await a.call("admin/orders/cancel", { id: order.id, reason: "customer asked" })
    expect(r.status).toBe(200)
    expect(r.json.refunds).toHaveLength(1)
    expect(h.one<string>("SELECT state FROM orders")).toBe("cancelled")
    expect(h.one<number>("SELECT reserved FROM stock_levels")).toBe(0)
    expect(h.fake.refundCalls.map((c) => c.amount)).toEqual([2000])
    expect((await a.call("admin/orders/cancel", { id: order.id })).status).toBe(409)
  })

  it("an expired manual reservation is swept and its stock returns", async () => {
    const h = await commerceHarness(closers)
    const c = h.client()
    await c.call("shop/cart/addLine", { variant: h.variant, quantity: 2 })
    const r = await c.call(
      "shop/checkout/reserve",
      { paymentMethod: "bank", email: "bank@example.com" },
      { "idempotency-key": "bank-key-0001" },
    )
    expect(r.json.next).toMatchObject({ kind: "pending" })
    expect(h.one<number>("SELECT reserved FROM stock_levels")).toBe(2)
    const payments = (await h.commerce.get(NOW)).payments
    await runMaintenanceOnce(h.platform, { now: NOW + 30 * 60_000, payments })
    expect(h.one<number>("SELECT reserved FROM stock_levels")).toBe(2)
    await runMaintenanceOnce(h.platform, { now: NOW + 2 * 3_600_000, payments })
    expect(h.one<string>("SELECT status FROM checkout_reservations")).toBe("expired")
    expect(h.one<number>("SELECT reserved FROM stock_levels")).toBe(0)
    expect(h.one<number>("SELECT count(*) FROM orders")).toBe(0)
  })

  it("order list queries use indexes (no full scan)", async () => {
    const h = await commerceHarness(closers)
    const cursor = Buffer.from(JSON.stringify([NOW, 5])).toString("base64url")
    for (const input of [
      { channelId: 1 },
      { channelId: 1, cursor },
      { channelId: 1, customerId: 1, cursor },
      { channelId: 1, state: "placed" as const },
    ]) {
      assertNoFullScan(h.sqlite.write, listOrdersQuery(input))
    }
  })
})
