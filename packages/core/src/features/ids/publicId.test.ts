import { describe, expect, it } from "vitest"
import { CROCKFORD_ALPHABET, encodeCrockford } from "./crockford"
import { isPublicId, newPublicId, normalizePrefix, parsePublicId } from "./publicId"

const BODY = /^[0-9A-HJKMNP-TV-Z]{10}$/

/** Fixed byte generator: the same call gives the same id (for collision tests). */
const fixed = (value: number) => (length: number) => new Uint8Array(length).fill(value)

describe("crockford", () => {
  it("the alphabet excludes I, L, O, U; 32 characters", () => {
    expect(CROCKFORD_ALPHABET).toHaveLength(32)
    expect(CROCKFORD_ALPHABET).not.toMatch(/[ILOU]/)
  })

  it("maps the low 5 bits of a byte to a character", () => {
    expect(encodeCrockford(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))).toBe("0123456789")
    expect(encodeCrockford(Uint8Array.from([31]))).toBe("ZZZZZZZZZZ")
  })

  it("rejects an empty buffer", () => {
    expect(() => encodeCrockford(new Uint8Array(0))).toThrow(RangeError)
  })
})

describe("newPublicId", () => {
  it("generates prefix + 10 characters of Crockford base32", () => {
    const id = newPublicId("chn_")
    expect(id.startsWith("chn_")).toBe(true)
    expect(id.slice(4)).toMatch(BODY)
  })

  it("also accepts a prefix without an underscore", () => {
    expect(newPublicId("prod")).toMatch(/^prod_[0-9A-HJKMNP-TV-Z]{10}$/)
  })

  it("rejects a prefix not in the map", () => {
    expect(() => newPublicId("zzz_")).toThrow(/önek haritada yok/)
    expect(() => newPublicId("1x_")).toThrow(/geçersiz önek/)
    expect(() => newPublicId("chn")).not.toThrow()
  })

  it("no collisions in 10 000 generations", () => {
    const ids = new Set<string>()
    for (let i = 0; i < 10_000; i += 1) ids.add(newPublicId("ord_"))
    expect(ids.size).toBe(10_000)
  })

  it("randomness can be injected (same bytes → same id)", () => {
    expect(newPublicId("aud_", fixed(0))).toBe("aud_0000000000")
    expect(newPublicId("aud_", fixed(0))).toBe(newPublicId("aud_", fixed(0)))
  })
})

describe("parsePublicId / isPublicId", () => {
  it("splits prefix and body", () => {
    expect(parsePublicId("chn_0123456789")).toEqual({ prefix: "chn_", body: "0123456789" })
  })

  it("rejects a wrong prefix", () => {
    expect(parsePublicId("zzz_0123456789")).toBeNull()
    expect(parsePublicId("0123456789")).toBeNull()
    expect(isPublicId("ord_0123456789", "chn")).toBe(false)
    expect(isPublicId("chn_0123456789", "chn_")).toBe(true)
  })

  it("rejects a lowercase body and forbidden characters", () => {
    expect(isPublicId("chn_abcdefghij")).toBe(false)
    expect(isPublicId("chn_012345678O")).toBe(false) // O forbidden
    expect(isPublicId("chn_012345678I")).toBe(false) // I forbidden
    expect(isPublicId("chn_012345678U")).toBe(false) // U forbidden
    expect(isPublicId("chn_01234567-9")).toBe(false)
  })

  it("length and type checks", () => {
    expect(isPublicId("chn_012345678")).toBe(false) // 9 characters
    expect(isPublicId("chn_01234567890")).toBe(false) // 11 characters
    expect(isPublicId(42)).toBe(false)
    expect(isPublicId(null)).toBe(false)
    expect(isPublicId(undefined)).toBe(false)
  })

  it("normalizePrefix adds the underscore", () => {
    expect(normalizePrefix("chn")).toBe("chn_")
    expect(normalizePrefix("chn_")).toBe("chn_")
    expect(() => normalizePrefix("")).toThrow(RangeError)
  })
})
