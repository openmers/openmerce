import { describe, expect, it } from "vitest"
import { assertHasVariant } from "./assertHasVariant"

describe("assertHasVariant", () => {
  it("en az bir varyant ister", () => {
    expect(() => assertHasVariant([])).toThrow(/en az bir varyant/)
  })

  it("boş SKU ve paket içi tekrar reddedilir; tekrar CONFLICT", () => {
    expect(() => assertHasVariant([{ sku: "  " }])).toThrow(/SKU boş/)
    expect(() => assertHasVariant([{ sku: "A" }, { sku: " A " }])).toThrow(/SKU yineleniyor/)
    try {
      assertHasVariant([{ sku: "A" }, { sku: "A" }])
    } catch (error) {
      expect(error).toMatchObject({ code: "CONFLICT" })
    }
  })

  it("veritabanındaki mevcut SKU ile çakışmayı yakalar", () => {
    expect(() => assertHasVariant([{ sku: "A" }], { previous: ["A"] })).toThrow(
      /SKU zaten kullanılıyor/,
    )
    expect(() => assertHasVariant([{ sku: "B" }], { previous: ["A"] })).not.toThrow()
  })
})
