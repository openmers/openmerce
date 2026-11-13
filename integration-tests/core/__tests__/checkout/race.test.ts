import { addLine } from "@openmers/core"
import { expectExactlyOneWinner, openTestDb } from "@openmers/test-utils"
import { describe, expect, it } from "vitest"
import { sqlitePlatform } from "../../../../packages/core/src/features/__testing__/sqlitePlatform"
import { NOW } from "../catalog/helpers"
import { level } from "../stock/helpers"
import { reserveCart, seedCheckout } from "./helpers"

// 05-sepet §8: file database, two independent connections (two requests). Correctness lives in
// the conditional write.
describe("[sqlite] checkout race", () => {
  const race = async (stock: number, coupons: string[], couponLimit: number | null) => {
    const file = openTestDb({ file: true })
    const s = await seedCheckout(file.connect(), { a: stock, b: 0 })
    if (couponLimit !== null) s.coupon("LAST", couponLimit)
    const carts = [s.cart(coupons), s.cart(coupons)]
    for (const cart of carts) {
      await addLine(
        { platform: s.p, now: NOW },
        { cartPublicId: cart, variantPublicId: s.variants.a, quantity: 1 },
      )
    }
    const [x, y] = [sqlitePlatform(file.connect()), sqlitePlatform(file.connect())]
    const results = await Promise.allSettled([
      reserveCart(x, s.ctx.channel, carts[0] as string, s.paymentMethodId),
      reserveCart(y, s.ctx.channel, carts[1] as string, s.paymentMethodId),
    ])
    return { file, s, results, check: file.connect() }
  }

  it("two reservations for the last unit: exactly one winner, reserved 1", async () => {
    const { file, s, results, check } = await race(1, [], null)
    try {
      expectExactlyOneWinner(results, "INSUFFICIENT_STOCK")
      expect(level(check, s.ids.a)).toMatchObject({ on_hand: 1, reserved: 1 })
      expect(check.prepare("SELECT count(*) FROM checkout_reservations").pluck().get()).toBe(1)
    } finally {
      file.close()
    }
  })

  it("two reservations for the last coupon use: exactly one winner, used 1", async () => {
    const { file, s, results, check } = await race(5, ["LAST"], 1)
    try {
      expectExactlyOneWinner(results, "COUPON_EXHAUSTED")
      expect(check.prepare("SELECT used FROM promotions").pluck().get()).toBe(1)
      expect(check.prepare("SELECT count(*) FROM checkout_reservations").pluck().get()).toBe(1)
      expect(level(check, s.ids.a)).toMatchObject({ reserved: 1 })
    } finally {
      file.close()
    }
  })
})
