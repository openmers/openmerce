import { addLine, createReservation, releaseReservation, updateLine } from "@openmers/core"
import { describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { NOW } from "../catalog/helpers"
import { count, level } from "../stock/helpers"
import { prepareCheckout, reserveCart, seedCheckout } from "./helpers"

describeOnTargets("checkout reservation", (getDb) => {
  const setup = async (stock: { a: number; b: number }) => {
    const s = await seedCheckout(getDb(), stock)
    const ctx = { platform: s.p, now: NOW }
    const prepare = (cart: string) => prepareCheckout(s.p, s.ctx.channel, cart, s.paymentMethodId)
    const reserve = (cart: string) => reserveCart(s.p, s.ctx.channel, cart, s.paymentMethodId)
    const add = (cart: string, variantPublicId: string, quantity: number) =>
      addLine(ctx, { cartPublicId: cart, variantPublicId, quantity })
    return { ...s, ctx, prepare, reserve, add }
  }
  const reservations = () => count(getDb(), "checkout_reservations")
  const used = (id: number) =>
    getDb().prepare("SELECT used FROM promotions WHERE id = ?").pluck().get(id)

  it("writes reservation, stock reservation, movements, source and snapshot", async () => {
    const s = await setup({ a: 5, b: 5 })
    const cart = s.cart()
    await s.add(cart, s.variants.a, 2)
    await s.add(cart, s.variants.b, 1)
    const { publicId } = await s.reserve(cart)

    const row = getDb()
      .prepare("SELECT status, source, snapshot FROM checkout_reservations WHERE public_id = ?")
      .get(publicId) as { status: string; source: string; snapshot: string }
    expect(row).toMatchObject({ status: "active", source: "web" })
    const snap = JSON.parse(row.snapshot)
    expect(snap.totals).toMatchObject({ subtotal: 4500, gross: 4500 })
    expect(snap.allocation).toHaveLength(2)
    expect(level(getDb(), s.ids.a)).toMatchObject({ on_hand: 5, reserved: 2 })
    expect(level(getDb(), s.ids.b)).toMatchObject({ reserved: 1 })
    expect(count(getDb(), "stock_movements WHERE kind = 'reservation' AND ref_id > 0")).toBe(2)
  })

  it("all or nothing: one line short at write time writes nothing", async () => {
    const s = await setup({ a: 5, b: 1 })
    const cart = s.cart()
    await s.add(cart, s.variants.a, 2)
    await s.add(cart, s.variants.b, 1)
    const input = await s.prepare(cart)
    // after the read, before the write, b's last unit goes to someone else
    getDb().prepare("UPDATE stock_levels SET reserved = 1 WHERE variant_id = ?").run(s.ids.b)
    await expect(createReservation(s.ctx, input)).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
    })
    expect(reservations()).toBe(0)
    expect(level(getDb(), s.ids.a)).toMatchObject({ reserved: 0 })
    expect(count(getDb(), "stock_movements WHERE kind = 'reservation'")).toBe(0)
  })

  it("stale cart version is rejected (CART_CHANGED), nothing written", async () => {
    const s = await setup({ a: 5, b: 5 })
    const cart = s.cart()
    const { lineKey } = await s.add(cart, s.variants.a, 1)
    const input = await s.prepare(cart)
    // another request changes the cart in between
    await updateLine(s.ctx, {
      cartPublicId: cart,
      variantPublicId: s.variants.a,
      lineKey,
      quantity: 3,
    })
    await expect(createReservation(s.ctx, input)).rejects.toMatchObject({ code: "CART_CHANGED" })
    expect(reservations()).toBe(0)
    expect(level(getDb(), s.ids.a)).toMatchObject({ reserved: 0 })
  })

  it("release returns stock and coupon count; second release is a no-op", async () => {
    const s = await setup({ a: 5, b: 5 })
    const promo = s.coupon("SAVE10", 1)
    const cart = s.cart(["save10"])
    await s.add(cart, s.variants.a, 2)
    const { publicId } = await s.reserve(cart)
    expect(used(promo)).toBe(1)
    expect(level(getDb(), s.ids.a)).toMatchObject({ reserved: 2 })

    expect(await releaseReservation(s.ctx, { reservationPublicId: publicId })).toBe(true)
    expect(level(getDb(), s.ids.a)).toMatchObject({ on_hand: 5, reserved: 0 })
    expect(used(promo)).toBe(0)
    expect(count(getDb(), "promotion_usage")).toBe(0)
    const status = getDb()
      .prepare("SELECT status FROM checkout_reservations WHERE public_id = ?")
      .pluck()
      .get(publicId)
    expect(status).toBe("released")

    expect(await releaseReservation(s.ctx, { reservationPublicId: publicId })).toBe(false)
    expect(level(getDb(), s.ids.a)).toMatchObject({ reserved: 0 })
    expect(count(getDb(), "stock_movements WHERE kind = 'release'")).toBe(1)
    // the coupon is usable again
    await s.reserve(cart)
    expect(used(promo)).toBe(1)
  })

  it("exhausted coupon: COUPON_EXHAUSTED, no reservation or stock written", async () => {
    const s = await setup({ a: 5, b: 5 })
    const promo = s.coupon("LAST", 1)
    const [first, second] = [s.cart(["LAST"]), s.cart(["LAST"])]
    await s.add(first, s.variants.a, 1)
    await s.add(second, s.variants.a, 1)
    // both see the coupon when calculating (count 0), only the first consumes it
    const [a, b] = [await s.prepare(first), await s.prepare(second)]
    expect(b.totals.discount).toBe(100)
    await createReservation(s.ctx, a)
    await expect(createReservation(s.ctx, b)).rejects.toMatchObject({ code: "COUPON_EXHAUSTED" })
    expect(reservations()).toBe(1)
    expect(used(promo)).toBe(1)
    expect(level(getDb(), s.ids.a)).toMatchObject({ reserved: 1 })
  })
})
