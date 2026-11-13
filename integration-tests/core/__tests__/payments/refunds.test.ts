import { createRefund, handleWebhook, markManualRefund } from "@openmers/core"
import { describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { SECRET, seedPayments } from "./helpers"

describeOnTargets("payment refunds", (getDb) => {
  const setup = async () => {
    const s = await seedPayments(getDb())
    const r = await s.reserve()
    const hook = async (event: Record<string, unknown> & { kind: string; eventId: string }) =>
      handleWebhook(s.rctx, { method: s.method, request: await s.fake.request(event, SECRET) })
    await hook(s.paidEvent(r.publicId, r.gross))
    const pay = () =>
      getDb()
        .prepare(
          "SELECT public_id, amount, refunded_amount, external_refunded_amount FROM payments",
        )
        .get() as {
        public_id: string
        amount: number
        refunded_amount: number
        external_refunded_amount: number
      }
    const status = () => getDb().prepare("SELECT payment_status FROM orders").pluck().get()
    return { ...s, r, hook, pay, status }
  }

  it("provider refund sync: delta rows, duplicate and stale events are no-ops", async () => {
    const s = await setup()
    expect(await s.hook(s.refundEvent(s.r.publicId, 300, "re_1"))).toEqual({
      kind: "refundSync",
      applied: true,
    })
    expect(await s.hook(s.refundEvent(s.r.publicId, 300, "re_1"))).toMatchObject({ applied: false })
    expect(await s.hook(s.refundEvent(s.r.publicId, 200, "re_0"))).toMatchObject({ applied: false })
    expect(await s.hook(s.refundEvent(s.r.publicId, 500, "re_2"))).toMatchObject({ applied: true })

    const amounts = getDb().prepare("SELECT amount FROM refunds ORDER BY id").pluck().all()
    expect(amounts).toEqual([300, 200])
    expect(s.pay().refunded_amount).toBe(500)
    expect(s.status()).toBe("partially_refunded")
    expect(s.rows("outbox WHERE kind = 'invoice'")).toBe(2)
  })

  it("refund total cannot exceed the payment", async () => {
    const s = await setup()
    const total = s.pay().amount
    await markManualRefund(s.rctx, { paymentPublicId: s.pay().public_id, amount: 400 })
    await expect(s.hook(s.refundEvent(s.r.publicId, total - 399, "re_x"))).rejects.toMatchObject({
      code: "REFUND_EXCEEDS",
    })
    await expect(
      markManualRefund(s.rctx, { paymentPublicId: s.pay().public_id, amount: total - 399 }),
    ).rejects.toMatchObject({ code: "REFUND_EXCEEDS" })
    await markManualRefund(s.rctx, { paymentPublicId: s.pay().public_id, amount: total - 400 })
    expect(s.pay()).toMatchObject({ refunded_amount: 0, external_refunded_amount: total })
    expect(s.status()).toBe("refunded")
  })

  it("refund event before its payment is retryable", async () => {
    const s = await seedPayments(getDb())
    const request = await s.fake.request(s.refundEvent("rsv_NONE", 100, "re_1"), SECRET)
    await expect(handleWebhook(s.rctx, { method: s.method, request })).rejects.toMatchObject({
      code: "PAYMENT_NOT_FOUND",
      retryable: true,
    })
  })

  it("admin refund: settled once per key; provider timeout stays unknown, never retried", async () => {
    const s = await setup()
    const base = {
      handler: s.fake.handler,
      args: s.method.args,
      paymentPublicId: s.pay().public_id,
    }
    const ok = await createRefund(s.rctx, { ...base, amount: 100, idempotencyKey: "k1" })
    expect(ok.state).toBe("settled")
    expect(await createRefund(s.rctx, { ...base, amount: 100, idempotencyKey: "k1" })).toEqual(ok)
    expect(s.fake.refundCalls).toHaveLength(1)
    expect(s.pay().refunded_amount).toBe(100)

    s.fake.setRefundMode("timeout")
    const lost = await createRefund(s.rctx, { ...base, amount: 50, idempotencyKey: "k2" })
    expect(lost.state).toBe("unknown")
    expect(await createRefund(s.rctx, { ...base, amount: 50, idempotencyKey: "k2" })).toEqual(lost)
    expect(s.fake.refundCalls).toHaveLength(2)
    expect(s.pay().refunded_amount).toBe(100)

    s.fake.setRefundMode("ok")
    // the unknown refund still counts against the cap
    const rest = s.pay().amount - 100
    await expect(
      createRefund(s.rctx, { ...base, amount: rest, idempotencyKey: "k3" }),
    ).rejects.toMatchObject({ code: "REFUND_EXCEEDS" })
  })
})
