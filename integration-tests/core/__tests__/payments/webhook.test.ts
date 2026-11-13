import { handleWebhook } from "@openmers/core"
import { describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { level } from "../stock/helpers"
import { SECRET, seedPayments } from "./helpers"

describeOnTargets("payment webhook", (getDb) => {
  it("registry offers the linked method and hides unknown handlers", async () => {
    const s = await seedPayments(getDb())
    expect(s.registry.forChannel(s.ctx.channel.id).map((m) => m.code)).toEqual(["card"])
    // the seed's `manual` method has no installed handler here
    expect(s.registry.byCode("manual")).toBeUndefined()
  })

  it("verified paid event settles; the duplicate delivery is a no-op", async () => {
    const s = await seedPayments(getDb())
    const r = await s.reserve()
    const event = s.paidEvent(r.publicId, r.gross)
    const hook = async () =>
      handleWebhook(s.rctx, { method: s.method, request: await s.fake.request(event, SECRET) })

    expect(await hook()).toMatchObject({ kind: "paid", created: true })
    expect(await hook()).toMatchObject({ kind: "paid", created: false })
    expect(s.rows("orders")).toBe(1)
    expect(s.rows("payments")).toBe(1)
    expect(s.rows("outbox WHERE event = 'order.placed'")).toBe(1)
    const payment = getDb()
      .prepare("SELECT payment_method_id, provider_reference FROM payments")
      .get()
    expect(payment).toEqual({
      payment_method_id: s.method.id,
      provider_reference: `pi_${r.publicId}`,
    })
  })

  it("bad signature writes nothing", async () => {
    const s = await seedPayments(getDb())
    const r = await s.reserve()
    const request = await s.fake.request(s.paidEvent(r.publicId, r.gross), SECRET, {
      badSignature: true,
    })
    await expect(handleWebhook(s.rctx, { method: s.method, request })).rejects.toMatchObject({
      code: "INVALID_SIGNATURE",
    })
    expect(s.rows("orders")).toBe(0)
  })

  it("wrong amount or currency is rejected, even with a valid signature", async () => {
    const s = await seedPayments(getDb())
    const r = await s.reserve()
    for (const extra of [{ amount: r.gross - 1 }, { currency: "EUR" }]) {
      const request = await s.fake.request(s.paidEvent(r.publicId, r.gross, extra), SECRET)
      await expect(handleWebhook(s.rctx, { method: s.method, request })).rejects.toMatchObject({
        code: "AMOUNT_MISMATCH",
        retryable: false,
      })
    }
    expect(s.rows("orders")).toBe(0)
  })

  it("the provider's status wins over the nudge (fetchStatus)", async () => {
    const s = await seedPayments(getDb())
    const r = await s.reserve()
    const truth = s.paidEvent(r.publicId, r.gross)
    s.fake.setTruth(truth.reference, { ...truth, kind: "pending" })
    const request = await s.fake.request(truth, SECRET, { forge: true })
    expect(await handleWebhook(s.rctx, { method: s.method, request })).toEqual({
      kind: "pending",
      changed: true,
    })
    expect(s.rows("orders")).toBe(0)
  })

  it("release event releases stock; unknown kinds are retryable", async () => {
    const s = await seedPayments(getDb())
    const r = await s.reserve({ qty: 2 })
    const release = { kind: "release", eventId: "evt_r", reservationPublicId: r.publicId }
    const out = await handleWebhook(s.rctx, {
      method: s.method,
      request: await s.fake.request(release, SECRET),
    })
    expect(out).toEqual({ kind: "release", changed: true })
    expect(level(getDb(), s.ids.a)).toMatchObject({ reserved: 0 })

    const odd = { kind: "dispute", eventId: "evt_d" }
    await expect(
      handleWebhook(s.rctx, { method: s.method, request: await s.fake.request(odd, SECRET) }),
    ).rejects.toMatchObject({ code: "UNKNOWN_EVENT", retryable: true })
  })
})
