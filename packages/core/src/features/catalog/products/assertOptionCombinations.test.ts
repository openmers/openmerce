import { describe, expect, it } from "vitest"
import { assertOptionCombinations } from "./assertOptionCombinations"

const options = [
  { code: "size", values: [{ code: "s" }, { code: "m" }] },
  { code: "color", values: [{ code: "red" }, { code: "blue" }] },
]
const variant = (size: string, color: string) => ({
  optionValues: [
    { option: "size", value: size },
    { option: "color", value: color },
  ],
})

describe("assertOptionCombinations", () => {
  it("her seçenekten tam bir değer taşıyan benzersiz kombinasyonları kabul eder", () => {
    expect(() =>
      assertOptionCombinations(options, [
        variant("s", "red"),
        variant("s", "blue"),
        variant("m", "red"),
        variant("m", "blue"),
      ]),
    ).not.toThrow()
  })

  it("eksik seçenek reddedilir", () => {
    expect(() =>
      assertOptionCombinations(options, [{ optionValues: [{ option: "size", value: "s" }] }]),
    ).toThrow(/her seçenekten bir değer/)
  })

  it("tekrarlı kombinasyon reddedilir", () => {
    expect(() =>
      assertOptionCombinations(options, [variant("s", "red"), variant("s", "red")]),
    ).toThrow(/kombinasyon yineleniyor/)
  })

  it("aynı seçenekten iki değer ve bilinmeyen kod reddedilir", () => {
    expect(() =>
      assertOptionCombinations(options, [
        {
          optionValues: [
            { option: "size", value: "s" },
            { option: "size", value: "m" },
            { option: "color", value: "red" },
          ],
        },
      ]),
    ).toThrow(/birden çok değer/)
    expect(() => assertOptionCombinations(options, [variant("xl", "red")])).toThrow(
      /bilinmeyen seçenek değeri/,
    )
    expect(() =>
      assertOptionCombinations(options, [{ optionValues: [{ option: "brand", value: "x" }] }]),
    ).toThrow(/bilinmeyen seçenek/)
  })

  it("seçeneksiz üründe varyant seçenek değeri taşımaz", () => {
    expect(() => assertOptionCombinations([], [{ optionValues: [] }])).not.toThrow()
    expect(() =>
      assertOptionCombinations([], [{ optionValues: [{ option: "size", value: "s" }] }]),
    ).toThrow(/bilinmeyen seçenek/)
  })

  it("seçenek ve değer kodlarının tekrarı reddedilir", () => {
    expect(() =>
      assertOptionCombinations(
        [
          { code: "size", values: [{ code: "s" }] },
          { code: "size", values: [{ code: "m" }] },
        ],
        [],
      ),
    ).toThrow(/seçenek kodu yineleniyor/)
    expect(() =>
      assertOptionCombinations([{ code: "size", values: [{ code: "s" }, { code: "s" }] }], []),
    ).toThrow(/seçenek değeri yineleniyor/)
  })
})
