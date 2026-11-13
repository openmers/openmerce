import { describe, expect, it } from "vitest"
import { convertAmount } from "./convertAmount"

const E9 = 1_000_000_000

describe("convertAmount (rate_e9, BigInt, half-up)", () => {
  it("whole rate and fractional rate", () => {
    expect(convertAmount(1000, 1.5 * E9)).toBe(1500)
    expect(convertAmount(0, 3 * E9)).toBe(0)
    expect(convertAmount(12_345, 34_123_456_789)).toBe(421_254)
  })

  it("half-up: .5 rounds up, below rounds down", () => {
    expect(convertAmount(1, E9 / 2)).toBe(1)
    expect(convertAmount(3, E9 / 2)).toBe(2)
    expect(convertAmount(1, E9 / 2 - 1)).toBe(0)
    expect(convertAmount(1, 1)).toBe(0)
  })

  it("minor unit digit difference (USD cents → JPY yen)", () => {
    expect(convertAmount(1000, 150 * E9, { from: 2, to: 0 })).toBe(1500)
    expect(convertAmount(150, Math.round(E9 / 150), { from: 0, to: 2 })).toBe(100)
  })

  it("boundary: safe integer × rate is computed without falling to floating point", () => {
    const max = Number.MAX_SAFE_INTEGER
    expect(convertAmount(max, E9)).toBe(max)
    expect(convertAmount(max, E9 - 1)).toBe(9_007_199_245_733_792)
    expect(() => convertAmount(max, E9 + 1)).toThrow(RangeError)
    expect(() => convertAmount(max, max)).toThrow(RangeError)
  })

  it("invalid input is rejected", () => {
    expect(() => convertAmount(-1, E9)).toThrow(RangeError)
    expect(() => convertAmount(1.5, E9)).toThrow(RangeError)
    expect(() => convertAmount(1, 0)).toThrow(RangeError)
    expect(() => convertAmount(1, 0.5)).toThrow(RangeError)
    expect(() => convertAmount(1, E9, { from: 5 })).toThrow(RangeError)
  })
})
