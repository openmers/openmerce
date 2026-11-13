import { describe, expect, it } from "vitest"
import { normalizePriceListIds, segmentKey } from "./segment"

const base = { channel: "chn_0000000001", lang: "en", currency: "USD", priceListIds: [3, 1] }

describe("segmentKey", () => {
  it("the same price list set in a different order gives the same key", () => {
    expect(segmentKey({ ...base, priceListIds: [1, 3] })).toBe(
      segmentKey({ ...base, priceListIds: [3, 1] }),
    )
    expect(segmentKey({ ...base, priceListIds: [3, 1, 3] })).toBe(
      segmentKey({ ...base, priceListIds: [1, 3] }),
    )
  })

  it("language/currency are normalized", () => {
    expect(segmentKey({ ...base, lang: "EN", currency: "usd" })).toBe(segmentKey(base))
  })

  it("channel, language, currency and list set change the key", () => {
    const key = segmentKey(base)
    expect(segmentKey({ ...base, channel: "chn_b" })).not.toBe(key)
    expect(segmentKey({ ...base, lang: "tr" })).not.toBe(key)
    expect(segmentKey({ ...base, currency: "EUR" })).not.toBe(key)
    expect(segmentKey({ ...base, priceListIds: [1] })).not.toBe(key)
  })

  it("the key is still stable without price lists", () => {
    expect(segmentKey({ ...base, priceListIds: [] })).toBe("chn_0000000001|en|USD|")
  })

  it("separator and invalid currency are rejected (so keys do not collide)", () => {
    expect(() => segmentKey({ ...base, channel: "a|b" })).toThrow(RangeError)
    expect(() => segmentKey({ ...base, lang: "en|tr" })).toThrow(RangeError)
    expect(() => segmentKey({ ...base, currency: "USDX" })).toThrow(RangeError)
    expect(() => segmentKey({ ...base, channel: "  " })).toThrow(RangeError)
  })

  it("negative or non-integer price lists are rejected", () => {
    expect(() => segmentKey({ ...base, priceListIds: [-1] })).toThrow(RangeError)
    expect(() => segmentKey({ ...base, priceListIds: [1.5] })).toThrow(RangeError)
  })
})

describe("normalizePriceListIds", () => {
  it("deduplicates and sorts ascending", () => {
    expect(normalizePriceListIds([5, 2, 5, 0])).toEqual([0, 2, 5])
    expect(normalizePriceListIds([])).toEqual([])
  })
})
