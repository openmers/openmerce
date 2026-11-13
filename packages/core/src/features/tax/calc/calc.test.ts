import { describe, expect, it } from "vitest"
import { allocateOrderDiscount } from "./allocateOrderDiscount"
import { splitGrossNet, splitLines } from "./splitGrossNet"

describe("splitGrossNet", () => {
  it("exclusive: tax rounds half-up, gross = net + tax", () => {
    expect(splitGrossNet({ amount: 999, rateBp: 1000, includesTax: false })).toEqual({
      net: 999,
      tax: 100, // 99.9
      gross: 1099,
    })
    expect(splitGrossNet({ amount: 1, rateBp: 5000, includesTax: false }).tax).toBe(1) // 0.5
    expect(splitGrossNet({ amount: 1004, rateBp: 1000, includesTax: false }).tax).toBe(100) // 100.4
  })

  it("inclusive: net is back-calculated, tax = gross − net (no cent loss)", () => {
    expect(splitGrossNet({ amount: 1000, rateBp: 2000, includesTax: true })).toEqual({
      net: 833, // 833.33
      tax: 167,
      gross: 1000,
    })
    expect(splitGrossNet({ amount: 105, rateBp: 1000, includesTax: true }).net).toBe(95) // 95.45
    expect(splitGrossNet({ amount: 21, rateBp: 10_000, includesTax: true }).net).toBe(11) // 10.5
  })

  it("rate 0 and amount 0", () => {
    expect(splitGrossNet({ amount: 500, rateBp: 0, includesTax: true })).toEqual({
      net: 500,
      tax: 0,
      gross: 500,
    })
    expect(splitGrossNet({ amount: 0, rateBp: 2000, includesTax: false }).gross).toBe(0)
  })

  it("no overflow on large amounts (bigint intermediate product)", () => {
    const amount = Number.MAX_SAFE_INTEGER - 1
    const s = splitGrossNet({ amount, rateBp: 2000, includesTax: true })
    expect(s.net + s.tax).toBe(amount)
  })

  it("invalid input is rejected", () => {
    expect(() => splitGrossNet({ amount: 1.5, rateBp: 2000, includesTax: true })).toThrow()
    expect(() => splitGrossNet({ amount: 10, rateBp: -1, includesTax: true })).toThrow()
  })

  it("order tax is the sum of the lines (not re-rounded)", () => {
    const lines = [1, 1, 1].map(() => ({ amount: 5, rateBp: 1000, includesTax: false }))
    const r = splitLines(lines)
    expect(r.lines.map((l) => l.tax)).toEqual([1, 1, 1]) // each 0.5 → 1
    expect(r.tax).toBe(3) // computed from the total it would be 1.5 → 2
    expect(r.net + r.tax).toBe(r.gross)
  })
})

describe("allocateOrderDiscount", () => {
  it("distributes proportionally, preserves the total", () => {
    expect(allocateOrderDiscount(300, [1000, 2000])).toEqual([100, 200])
  })

  it("remainder cents go to the larger fraction, ties to the earlier line", () => {
    expect(allocateOrderDiscount(1, [1, 1, 1])).toEqual([1, 0, 0])
    expect(allocateOrderDiscount(2, [1, 1, 1])).toEqual([1, 1, 0])
    expect(allocateOrderDiscount(10, [333, 333, 334])).toEqual([3, 3, 4])
    expect(allocateOrderDiscount(10, [100, 200, 300])).toEqual([2, 3, 5]) // 1.67, 3.33, 5
  })

  it("the same input always gives the same result; the sum is always the discount", () => {
    const amounts = [123, 457, 999, 1, 0, 86]
    const a = allocateOrderDiscount(777, amounts)
    expect(allocateOrderDiscount(777, amounts)).toEqual(a)
    expect(a.reduce((x, y) => x + y, 0)).toBe(777)
    a.forEach((share, i) => {
      expect(share).toBeLessThanOrEqual(amounts[i] ?? 0)
    })
  })

  it("a discount above the total is clipped; if the total is 0, all are 0", () => {
    expect(allocateOrderDiscount(5000, [100, 200])).toEqual([100, 200])
    expect(allocateOrderDiscount(50, [0, 0])).toEqual([0, 0])
    expect(() => allocateOrderDiscount(-1, [1])).toThrow()
  })
})
