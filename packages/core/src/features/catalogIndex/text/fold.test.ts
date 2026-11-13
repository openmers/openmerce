import { describe, expect, it } from "vitest"
import { foldText, toMatchQuery } from "./fold"

describe("foldText", () => {
  it("folds Turkish dotted and dotless i for tr", () => {
    expect(foldText("Işık", "tr")).toBe("isik")
    expect(foldText("IŞIK", "tr")).toBe("isik")
    expect(foldText("İstanbul", "tr-TR")).toBe("istanbul")
    expect(foldText("Şeker Çiğ Gül Öz", "tr")).toBe("seker cig gul oz")
  })

  it("does not apply the Turkish table to other languages", () => {
    expect(foldText("ı", "en")).toBe("ı")
    expect(foldText("Işık", "en")).toBe("isık")
  })

  it("strips combining marks for every language", () => {
    expect(foldText("Crème Brûlée", "fr")).toBe("creme brulee")
    expect(foldText("Ñandú", "es")).toBe("nandu")
  })
})

describe("toMatchQuery", () => {
  it("quotes every folded token as a prefix term", () => {
    expect(toMatchQuery("Işık  lamba", "tr")).toBe('"isik"* "lamba"*')
    expect(toMatchQuery("TS-s", "en")).toBe('"ts"* "s"*')
  })

  it("drops FTS syntax and returns null for empty input", () => {
    expect(toMatchQuery('a" OR NEAR(*', "en")).toBe('"a"* "or"* "near"*')
    expect(toMatchQuery(" -*- ", "en")).toBeNull()
  })
})
