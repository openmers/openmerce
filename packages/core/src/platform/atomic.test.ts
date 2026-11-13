import { describe, expect, it } from "vitest"
import { affected, allAffected } from "./atomic"

describe("allAffected", () => {
  it("hepsi > 0 ise true, biri 0 ise false", () => {
    expect(allAffected([1, 2])).toBe(true)
    expect(allAffected([1, 0])).toBe(false)
    expect(allAffected([])).toBe(true)
  })
})

describe("affected", () => {
  it("ifadenin kazanıp kazanmadığını okur", () => {
    expect(affected([1, 0], 0)).toBe(true)
    expect(affected([1, 0], 1)).toBe(false)
  })

  it("aralık dışı indeks hata verir", () => {
    expect(() => affected([1], 1)).toThrow(RangeError)
  })
})
