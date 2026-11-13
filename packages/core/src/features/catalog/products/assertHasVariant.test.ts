import { describe, expect, it } from "vitest"
import { assertHasVariant } from "./assertHasVariant"

describe("assertHasVariant", () => {
  it("requires at least one variant", () => {
    expect(() => assertHasVariant([])).toThrow(/en az bir varyant/)
  })

  it("an empty SKU and a duplicate within the payload are rejected; duplicate is CONFLICT", () => {
    expect(() => assertHasVariant([{ sku: "  " }])).toThrow(/SKU boş/)
    expect(() => assertHasVariant([{ sku: "A" }, { sku: " A " }])).toThrow(/SKU yineleniyor/)
    try {
      assertHasVariant([{ sku: "A" }, { sku: "A" }])
    } catch (error) {
      expect(error).toMatchObject({ code: "CONFLICT" })
    }
  })

  it("catches a collision with an existing SKU in the database", () => {
    expect(() => assertHasVariant([{ sku: "A" }], { previous: ["A"] })).toThrow(
      /SKU zaten kullanılıyor/,
    )
    expect(() => assertHasVariant([{ sku: "B" }], { previous: ["A"] })).not.toThrow()
  })
})
