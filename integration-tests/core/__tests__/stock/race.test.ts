import { adjustStock, reserveStock } from "@openmers/core"
import { expectExactlyOneWinner, openTestDb } from "@openmers/test-utils"
import { describe, expect, it } from "vitest"
import { sqlitePlatform } from "../../../../packages/core/src/features/__testing__/sqlitePlatform"
import { level, seedStock } from "./helpers"

// Race: file database, two independent connections (two requests). Correctness lies in the conditional write.
describe("[sqlite] stock race", () => {
  it("two connections reserve the last unit at once: exactly one winner, reserved 1", async () => {
    const file = openTestDb({ file: true })
    try {
      const s = await seedStock(file.connect())
      await adjustStock(s.ctx, {
        variantPublicId: s.variants.a,
        locationPublicId: s.location,
        delta: 1,
      })
      const line = [{ variantId: s.ids.a, locationId: s.ids.location, quantity: 1 }]
      const [a, b] = [sqlitePlatform(file.connect()), sqlitePlatform(file.connect())]
      const results = await Promise.allSettled([
        reserveStock(a, line, { type: "reservation", id: 1 }, 1),
        reserveStock(b, line, { type: "reservation", id: 2 }, 1),
      ])
      expectExactlyOneWinner(results, "INSUFFICIENT_STOCK")

      const check = file.connect()
      expect(level(check, s.ids.a)).toMatchObject({ on_hand: 1, reserved: 1 })
      const moves = check.prepare("SELECT count(*) FROM stock_movements WHERE kind = 'reservation'")
      expect(moves.pluck().get()).toBe(1)
    } finally {
      file.close()
    }
  })
})
