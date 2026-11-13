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
  it("accepts unique combinations carrying exactly one value from each option", () => {
    expect(() =>
      assertOptionCombinations(options, [
        variant("s", "red"),
        variant("s", "blue"),
        variant("m", "red"),
        variant("m", "blue"),
      ]),
    ).not.toThrow()
  })

  it("a missing option is rejected", () => {
    expect(() =>
      assertOptionCombinations(options, [{ optionValues: [{ option: "size", value: "s" }] }]),
    ).toThrow(/her seçenekten bir değer/)
  })

  it("a duplicate combination is rejected", () => {
    expect(() =>
      assertOptionCombinations(options, [variant("s", "red"), variant("s", "red")]),
    ).toThrow(/kombinasyon yineleniyor/)
  })

  it("two values from the same option and an unknown code are rejected", () => {
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

  it("in a product without options, variants carry no option values", () => {
    expect(() => assertOptionCombinations([], [{ optionValues: [] }])).not.toThrow()
    expect(() =>
      assertOptionCombinations([], [{ optionValues: [{ option: "size", value: "s" }] }]),
    ).toThrow(/bilinmeyen seçenek/)
  })

  it("duplicate option and value codes are rejected", () => {
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
