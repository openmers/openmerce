import { numberPeriod, orderNumber, releaseReservation } from "@openmers/core"
import { describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { NOW } from "../catalog/helpers"
import { level } from "../stock/helpers"
import { seedSettle } from "./settleHelpers"

describeOnTargets("checkout settlement", (getDb) => {
  const one = <T = unknown>(sql: string, ...args: unknown[]) =>
    getDb()
      .prepare(sql)
      .get(...args) as T

  it("webhook + return page settle once: one order, one number, one outbox row", async () => {
    const s = await seedSettle(getDb(), { a: 5, b: 0 })
    const r = await s.reserve({ qty: 2 })
    const first = await s.settle(s.paid(r.publicId, r.gross))
    const second = await s.settle(s.paid(r.publicId, r.gross))

    expect(first).toMatchObject({ created: true, stockException: false })
    expect(second).toEqual({ ...first, created: false })
    expect(first.number).toBe(orderNumber(numberPeriod(NOW), 1))
    expect(s.rows("orders")).toBe(1)
    expect(s.rows("payments")).toBe(1)
    expect(s.rows("order_lines")).toBe(1)
    expect(s.rows("outbox WHERE event = 'order.placed'")).toBe(1)
    expect(one("SELECT status FROM checkout_reservations WHERE public_id = ?", r.publicId)).toEqual(
      {
        status: "settled",
      },
    )
    expect(one("SELECT status FROM carts WHERE public_id = ?", r.cart)).toEqual({
      status: "closed",
    })
    expect(
      one(
        "SELECT payment_status, total_gross, customer_id, lang FROM orders WHERE public_id = ?",
        first.orderPublicId,
      ),
    ).toEqual({
      payment_status: "paid",
      total_gross: r.gross,
      customer_id: s.customerId,
      lang: "en",
    })
    expect(one("SELECT sku, quantity, stock_units FROM order_lines")).toEqual({
      sku: "K-1",
      quantity: 2,
      stock_units: 2,
    })
    // stock stays reserved, now owned by the order (shipped later)
    expect(level(getDb(), s.ids.a)).toMatchObject({ on_hand: 5, reserved: 2 })
  })

  it("order numbers are gapless per channel; a rejected settlement uses no number", async () => {
    const s = await seedSettle(getDb(), { a: 10, b: 0 })
    const numbers: string[] = []
    for (let i = 0; i < 3; i++) {
      const r = await s.reserve()
      await expect(s.settle(s.paid(r.publicId, r.gross + 1))).rejects.toMatchObject({
        code: "PAYMENT_MISMATCH",
      })
      numbers.push((await s.settle(s.paid(r.publicId, r.gross))).number)
    }
    const period = numberPeriod(NOW)
    expect(numbers).toEqual([1, 2, 3].map((n) => orderNumber(period, n)))
    expect(one("SELECT last_value FROM order_number_counters")).toEqual({ last_value: 3 })
  })

  it("wrong amount or currency is rejected and writes nothing", async () => {
    const s = await seedSettle(getDb(), { a: 5, b: 0 })
    const r = await s.reserve()
    const input = s.paid(r.publicId, r.gross)
    const payment = input.payment as NonNullable<typeof input.payment>
    for (const bad of [{ amount: r.gross - 1 }, { currency: "EUR" }]) {
      await expect(s.settle({ ...input, payment: { ...payment, ...bad } })).rejects.toMatchObject({
        code: "PAYMENT_MISMATCH",
      })
    }
    expect(s.rows("orders")).toBe(0)
    expect(s.rows("order_number_counters")).toBe(0)
  })

  it("coupon usage gets the order id and is not returned by a later release", async () => {
    const s = await seedSettle(getDb(), { a: 5, b: 0 })
    s.coupon("SAVE", 10)
    const r = await s.reserve({ coupons: ["SAVE"] })
    const { orderPublicId } = await s.settle(s.paid(r.publicId, r.gross))
    const { id } = one<{ id: number }>("SELECT id FROM orders WHERE public_id = ?", orderPublicId)
    expect(one("SELECT order_id FROM promotion_usage")).toEqual({ order_id: id })
    expect(s.rows("order_adjustments WHERE source = 'coupon'")).toBe(1)

    expect(
      await releaseReservation({ platform: s.p, now: NOW }, { reservationPublicId: r.publicId }),
    ).toBe(false)
    expect(one("SELECT used FROM promotions")).toEqual({ used: 1 })
    expect(s.rows("promotion_usage")).toBe(1)
    expect(level(getDb(), s.ids.a)).toMatchObject({ reserved: 1 })
  })

  it("late payment after release reserves stock again under the order", async () => {
    const s = await seedSettle(getDb(), { a: 5, b: 0 })
    const r = await s.reserve({ qty: 2 })
    await releaseReservation({ platform: s.p, now: NOW }, { reservationPublicId: r.publicId })
    expect(level(getDb(), s.ids.a)).toMatchObject({ reserved: 0 })

    const res = await s.settle(s.paid(r.publicId, r.gross))
    expect(res).toMatchObject({ created: true, stockException: false })
    expect(level(getDb(), s.ids.a)).toMatchObject({ reserved: 2 })
    expect(s.rows("stock_movements WHERE ref_type = 'order' AND kind = 'reservation'")).toBe(1)
    expect(one("SELECT status FROM checkout_reservations")).toEqual({ status: "settled" })
  })

  it("late payment without stock is recorded with a stock exception", async () => {
    const s = await seedSettle(getDb(), { a: 2, b: 0 })
    const r = await s.reserve({ qty: 2 })
    await releaseReservation(
      { platform: s.p, now: NOW },
      { reservationPublicId: r.publicId, status: "expired" },
    )
    getDb().prepare("UPDATE stock_levels SET reserved = 1 WHERE variant_id = ?").run(s.ids.a)

    const res = await s.settle(s.paid(r.publicId, r.gross))
    expect(res).toMatchObject({ created: true, stockException: true })
    expect(s.rows("payments")).toBe(1)
    expect(level(getDb(), s.ids.a)).toMatchObject({ reserved: 1 })
    expect(s.rows("stock_movements WHERE ref_type = 'order'")).toBe(0)
  })
})
