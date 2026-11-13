import { describe, expect, it } from "vitest"
import { normalizeEmail } from "./normalizeEmail"

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Jane.Doe@Example.COM \n")).toBe("jane.doe@example.com")
  })

  it("composed and decomposed unicode give the same value", () => {
    const composed = "Jörg@example.com"
    const decomposed = "Jörg@EXAMPLE.com"
    expect(normalizeEmail(composed)).toBe(normalizeEmail(decomposed))
    expect(normalizeEmail(composed)).toBe("jörg@example.com")
  })

  it("keeps plus tags and dots (provider rules are not applied)", () => {
    expect(normalizeEmail("a.b+tag@example.com")).toBe("a.b+tag@example.com")
  })

  it.each(["", "   ", "no-at-sign", "@example.com", "user@", "a b@example.com"])(
    "rejects %j",
    (value) => {
      expect(() => normalizeEmail(value)).toThrow(
        expect.objectContaining({ code: "INVALID_INPUT" }),
      )
    },
  )
})
