import {
  adjustStock,
  commitStock,
  releaseStock,
  reserveStatements,
  reserveStock,
} from "@openmers/core"
import { describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { count, level, seedStock } from "./helpers"

const REF = { type: "reservation" as const, id: 1 }

describeOnTargets("stock reservation", (getDb) => {
  const prepare = async (a: number, b: number) => {
    const s = await seedStock(getDb())
    for (const [variant, delta] of [
      [s.variants.a, a],
      [s.variants.b, b],
    ] as const) {
      if (delta > 0)
        await adjustStock(s.ctx, { variantPublicId: variant, locationPublicId: s.location, delta })
    }
    getDb().prepare("DELETE FROM stock_movements").run()
    const line = (variantId: number, quantity: number) => ({
      variantId,
      locationId: s.ids.location,
      quantity,
    })
    return { ...s, line }
  }

  it("multi-line: if one line is short, no row changes and no movement", async () => {
    const s = await prepare(5, 1)
    const stmts = reserveStatements([s.line(s.ids.a, 2), s.line(s.ids.b, 2)], REF, 1)
    expect(await s.p.atomic(stmts)).toEqual([0, 0])
    await expect(
      reserveStock(s.p, [s.line(s.ids.a, 2), s.line(s.ids.b, 2)], REF, 1),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" })
    expect(level(getDb(), s.ids.a)).toMatchObject({ reserved: 0, version: 1 })
    expect(level(getDb(), s.ids.b)).toMatchObject({ reserved: 0, version: 1 })
    expect(count(getDb(), "stock_movements")).toBe(0)
  })

  it("the condition is evaluated once before writing: the second line is written even if the first takes the last unit", async () => {
    const s = await prepare(1, 3)
    await reserveStock(s.p, [s.line(s.ids.a, 1), s.line(s.ids.b, 3)], REF, 1)
    expect(level(getDb(), s.ids.a)).toMatchObject({ on_hand: 1, reserved: 1 })
    expect(level(getDb(), s.ids.b)).toMatchObject({ on_hand: 3, reserved: 3 })
    expect(count(getDb(), "stock_movements WHERE kind = 'reservation'")).toBe(2)
  })

  it("the same variant in two lines is summed; safety is subtracted from sellable", async () => {
    const s = await prepare(5, 0)
    getDb().prepare("UPDATE stock_levels SET safety = 1 WHERE variant_id = ?").run(s.ids.a)
    await expect(
      reserveStock(s.p, [s.line(s.ids.a, 3), s.line(s.ids.a, 2)], REF, 1),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" })
    await reserveStock(s.p, [s.line(s.ids.a, 3), s.line(s.ids.a, 1)], REF, 1)
    expect(level(getDb(), s.ids.a)).toMatchObject({ reserved: 4 })
    expect(getDb().prepare("SELECT quantity FROM stock_movements").pluck().all()).toEqual([4])
  })

  it("calling release twice makes the second a no-op", async () => {
    const s = await prepare(5, 0)
    const other = { type: "reservation" as const, id: 2 }
    await reserveStock(s.p, [s.line(s.ids.a, 2)], REF, 1)
    await reserveStock(s.p, [s.line(s.ids.a, 2)], other, 1)
    expect(await releaseStock(s.p, [s.line(s.ids.a, 2)], REF, 2)).toBe(true)
    expect(await releaseStock(s.p, [s.line(s.ids.a, 2)], REF, 3)).toBe(false)
    expect(level(getDb(), s.ids.a)).toMatchObject({ on_hand: 5, reserved: 2 })
    expect(count(getDb(), "stock_movements WHERE kind = 'release'")).toBe(1)
    // A reference without a reservation cannot be released.
    expect(await releaseStock(s.p, [s.line(s.ids.a, 1)], { ...REF, id: 9 }, 4)).toBe(false)
  })

  it("commit subtracts the reserved amount from on-hand; a released reservation cannot be committed", async () => {
    const s = await prepare(5, 0)
    await reserveStock(s.p, [s.line(s.ids.a, 2)], REF, 1)
    expect(await commitStock(s.p, [s.line(s.ids.a, 2)], REF, 2)).toBe(true)
    expect(await commitStock(s.p, [s.line(s.ids.a, 2)], REF, 3)).toBe(false)
    expect(await releaseStock(s.p, [s.line(s.ids.a, 2)], REF, 4)).toBe(false)
    expect(level(getDb(), s.ids.a)).toMatchObject({ on_hand: 3, reserved: 0 })
    const sale = getDb().prepare("SELECT quantity, units FROM stock_movements WHERE kind = 'sale'")
    expect(sale.all()).toEqual([{ quantity: -2, units: -2 }])
  })

  it("an invalid line is rejected", async () => {
    const s = await prepare(1, 1)
    expect(() => reserveStatements([], REF, 1)).toThrow(/kalem yok/)
    expect(() => reserveStatements([s.line(s.ids.a, 0)], REF, 1)).toThrow()
    expect(() => reserveStatements([s.line(s.ids.a, 1.5)], REF, 1)).toThrow()
  })
})
