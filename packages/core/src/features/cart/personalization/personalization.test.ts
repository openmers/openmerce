import { describe, expect, it } from "vitest"
import { lineKey } from "./lineKey"
import { normalizeText } from "./normalize"
import { effectiveDefinition } from "./schema"
import { surchargePerUnit } from "./surcharge"
import { validatePersonalization } from "./validate"

const PRODUCT = {
  enabled: true,
  fields: [
    { key: "engraving", type: "text", maxLength: 10, pattern: "[A-Za-z ]+" },
    { key: "note", type: "text", maxLength: 50, multiline: true },
    { key: "color", type: "select", options: ["gold", "silver"], required: true },
    { key: "artwork", type: "image", maxBytes: 1000, mime: ["image/png"] },
    { key: "wrap", type: "boolean" },
  ],
  surcharge: [
    { when: "engraving", amount: { USD: 1000, EUR: 900 } },
    { when: "artwork", percent: 5 },
  ],
}
const def = effectiveDefinition(PRODUCT, null)
const reason = (fn: () => unknown) => {
  try {
    fn()
  } catch (e) {
    const err = e as { code: string; field?: { reason: string } }
    return err.field ? err.field.reason : err.code
  }
  return "ok"
}

describe("personalization", () => {
  it("definition: variant inherits or disables; malformed counts as disabled", () => {
    expect(def?.fields).toHaveLength(5)
    expect(effectiveDefinition(PRODUCT, { enabled: false })).toBeNull()
    expect(effectiveDefinition({ enabled: true, fields: [] }, null)).toBeNull()
    expect(effectiveDefinition(null, null)).toBeNull()
  })

  it("rejects personalization on a disabled variant, accepts empty input", () => {
    expect(reason(() => validatePersonalization(null, { engraving: "x" }))).toBe(
      "PERSONALIZATION_NOT_ALLOWED",
    )
    expect(validatePersonalization(null, {})).toBeNull()
    expect(validatePersonalization(null, undefined)).toBeNull()
  })

  it("rule violations are field-coded", () => {
    const v = (input: Record<string, unknown>) =>
      reason(() => validatePersonalization(def, { color: "gold", ...input }))
    expect(reason(() => validatePersonalization(def, {}))).toBe("REQUIRED")
    expect(v({ unknown: "x" })).toBe("UNKNOWN_FIELD")
    expect(v({ engraving: "abcdefghijk" })).toBe("MAX_LENGTH")
    expect(v({ engraving: "abc1" })).toBe("PATTERN")
    expect(v({ color: "red" })).toBe("INVALID_OPTION")
    expect(v({ engraving: 5 })).toBe("INVALID_TYPE")
    expect(v({ artwork: "med_X" })).toBe("MEDIA_NOT_FOUND")
    const media = (mime: string, bytes: number) => () => ({ mime, bytes })
    const img = (m: () => { mime: string; bytes: number }) =>
      reason(() => validatePersonalization(def, { color: "gold", artwork: "med_X" }, m))
    expect(img(media("image/gif", 10))).toBe("MIME")
    expect(img(media("image/png", 5000))).toBe("TOO_LARGE")
    expect(img(media("image/png", 10))).toBe("ok")
  })

  it("normalize: NFC, control characters, trim; HTML stays plain text", () => {
    expect(normalizeText("  é\u0007 ")).toBe("é")
    expect(normalizeText("a\r\nb", true)).toBe("a\nb")
    expect(normalizeText("a\nb")).toBe("ab")
    expect(normalizeText("a‮b")).toBe("ab")
    const out = validatePersonalization(def, { color: "gold", note: "<b>hi</b>" })
    expect(out).toEqual({ color: "gold", note: "<b>hi</b>" })
  })

  it("empty field is not stored and triggers no surcharge", () => {
    const out = validatePersonalization(def, { color: "gold", engraving: "  ", wrap: false })
    expect(out).toEqual({ color: "gold" })
    expect(surchargePerUnit(def, out, 5000, "USD")).toBe(0)
  })

  it("surcharge: fixed per currency + percent of list price; null without the currency", () => {
    const value = { color: "gold", engraving: "Ada", artwork: "med_X" } as const
    expect(surchargePerUnit(def, value, 5000, "USD")).toBe(1000 + 250)
    expect(surchargePerUnit(def, value, 5000, "EUR")).toBe(900 + 250)
    expect(surchargePerUnit(def, value, 5000, "TRY")).toBeNull()
  })

  it("line_key: same personalization same key, different differs; empty is ''", async () => {
    const a = await lineKey({ engraving: "Ada", color: "gold" })
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(await lineKey({ color: "gold", engraving: "Ada" })).toBe(a)
    expect(await lineKey({ color: "gold", engraving: "Ece" })).not.toBe(a)
    expect(await lineKey(null)).toBe("")
    expect(await lineKey({})).toBe("")
  })
})
