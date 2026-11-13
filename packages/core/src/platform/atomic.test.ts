import { describe, expect, it } from "vitest"
import { affected, allAffected } from "./atomic"

describe("allAffected", () => {
  it("true if all > 0, false if any is 0", () => {
    expect(allAffected([1, 2])).toBe(true)
    expect(allAffected([1, 0])).toBe(false)
    expect(allAffected([])).toBe(true)
  })
})

describe("affected", () => {
  it("reads whether a statement won", () => {
    expect(affected([1, 0], 0)).toBe(true)
    expect(affected([1, 0], 1)).toBe(false)
  })

  it("an out-of-range index throws", () => {
    expect(() => affected([1], 1)).toThrow(RangeError)
  })
})
