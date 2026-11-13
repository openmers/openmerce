import { describe, expect, it } from "vitest"
import { normalizePriceListIds, segmentKey } from "./segment"

const base = { channel: "chn_0000000001", lang: "en", currency: "USD", priceListIds: [3, 1] }

describe("segmentKey", () => {
  it("aynı fiyat listesi kümesi farklı sırada aynı anahtarı verir", () => {
    expect(segmentKey({ ...base, priceListIds: [1, 3] })).toBe(
      segmentKey({ ...base, priceListIds: [3, 1] }),
    )
    expect(segmentKey({ ...base, priceListIds: [3, 1, 3] })).toBe(
      segmentKey({ ...base, priceListIds: [1, 3] }),
    )
  })

  it("dil/para birimi normalize edilir", () => {
    expect(segmentKey({ ...base, lang: "EN", currency: "usd" })).toBe(segmentKey(base))
  })

  it("kanal, dil, para birimi ve liste kümesi anahtarı değiştirir", () => {
    const key = segmentKey(base)
    expect(segmentKey({ ...base, channel: "chn_b" })).not.toBe(key)
    expect(segmentKey({ ...base, lang: "tr" })).not.toBe(key)
    expect(segmentKey({ ...base, currency: "EUR" })).not.toBe(key)
    expect(segmentKey({ ...base, priceListIds: [1] })).not.toBe(key)
  })

  it("fiyat listesi yoksa anahtar yine kararlı", () => {
    expect(segmentKey({ ...base, priceListIds: [] })).toBe("chn_0000000001|en|USD|")
  })

  it("ayraç ve geçersiz para birimi reddedilir (anahtar çakışmasın)", () => {
    expect(() => segmentKey({ ...base, channel: "a|b" })).toThrow(RangeError)
    expect(() => segmentKey({ ...base, lang: "en|tr" })).toThrow(RangeError)
    expect(() => segmentKey({ ...base, currency: "USDX" })).toThrow(RangeError)
    expect(() => segmentKey({ ...base, channel: "  " })).toThrow(RangeError)
  })

  it("negatif veya tamsayı olmayan fiyat listesi reddedilir", () => {
    expect(() => segmentKey({ ...base, priceListIds: [-1] })).toThrow(RangeError)
    expect(() => segmentKey({ ...base, priceListIds: [1.5] })).toThrow(RangeError)
  })
})

describe("normalizePriceListIds", () => {
  it("tekilleştirir ve artan sıralar", () => {
    expect(normalizePriceListIds([5, 2, 5, 0])).toEqual([0, 2, 5])
    expect(normalizePriceListIds([])).toEqual([])
  })
})
