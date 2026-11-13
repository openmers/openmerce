import { CheckoutError, numberPeriod, orderNumber, type SettleResult } from "@openmers/core"
import { expectExactlyOneWinner, openTestDb } from "@openmers/test-utils"
import { describe, expect, it } from "vitest"
import { sqlitePlatform } from "../../../../packages/core/src/features/__testing__/sqlitePlatform"
import { NOW } from "../catalog/helpers"
import { count } from "../stock/helpers"
import { seedSettle } from "./settleHelpers"

// 05-sepet §6/§8: webhook and return page as two requests on two connections; the settlement
// token decides, there is no lock. The loser is not an error in production (it returns the
// winner's order); here it is mapped to one so the race helper can count winners.
const winnerOnly = (r: SettleResult) => {
  if (!r.created) throw new CheckoutError("CONFLICT", "lost the settlement")
  return r
}

describe("[sqlite] settlement race", () => {
  it("two parallel settlements of one reservation: one winner, one order, one number", async () => {
    const file = openTestDb({ file: true })
    try {
      const s = await seedSettle(file.connect(), { a: 5, b: 0 })
      const r = await s.reserve()
      const [x, y] = [sqlitePlatform(file.connect()), sqlitePlatform(file.connect())]
      const results = await Promise.allSettled([
        s.settle(s.paid(r.publicId, r.gross), x).then(winnerOnly),
        s.settle(s.paid(r.publicId, r.gross), y).then(winnerOnly),
      ])
      const won = expectExactlyOneWinner(results, "CONFLICT")
      const check = file.connect()
      expect(won.number).toBe(orderNumber(numberPeriod(NOW), 1))
      expect(count(check, "orders")).toBe(1)
      expect(count(check, "payments")).toBe(1)
      expect(count(check, "outbox WHERE event = 'order.placed'")).toBe(1)
      expect(check.prepare("SELECT last_value FROM order_number_counters").pluck().get()).toBe(1)
    } finally {
      file.close()
    }
  })

  it("parallel settlements of different reservations get distinct gapless numbers", async () => {
    const file = openTestDb({ file: true })
    try {
      const s = await seedSettle(file.connect(), { a: 10, b: 0 })
      const rs = [await s.reserve(), await s.reserve(), await s.reserve()]
      const results = await Promise.all(
        rs.map((r) => s.settle(s.paid(r.publicId, r.gross), sqlitePlatform(file.connect()))),
      )
      const period = numberPeriod(NOW)
      expect(results.map((r) => r.number).sort()).toEqual(
        [1, 2, 3].map((n) => orderNumber(period, n)),
      )
    } finally {
      file.close()
    }
  })
})
