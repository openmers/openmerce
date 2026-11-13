import { describe, expect, it } from "vitest"
import { CROCKFORD_ALPHABET, encodeCrockford } from "./crockford"
import { isPublicId, newPublicId, normalizePrefix, parsePublicId } from "./publicId"

const BODY = /^[0-9A-HJKMNP-TV-Z]{10}$/

/** Sabit bayt üreteci: aynı çağrı aynı kimliği verir (çakışma testleri için). */
const fixed = (value: number) => (length: number) => new Uint8Array(length).fill(value)

describe("crockford", () => {
  it("alfabe I, L, O, U içermez; 32 karakter", () => {
    expect(CROCKFORD_ALPHABET).toHaveLength(32)
    expect(CROCKFORD_ALPHABET).not.toMatch(/[ILOU]/)
  })

  it("baytın alt 5 bitini karaktere çevirir", () => {
    expect(encodeCrockford(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))).toBe("0123456789")
    expect(encodeCrockford(Uint8Array.from([31]))).toBe("ZZZZZZZZZZ")
  })

  it("boş tamponu reddeder", () => {
    expect(() => encodeCrockford(new Uint8Array(0))).toThrow(RangeError)
  })
})

describe("newPublicId", () => {
  it("önek + 10 karakter Crockford base32 üretir", () => {
    const id = newPublicId("chn_")
    expect(id.startsWith("chn_")).toBe(true)
    expect(id.slice(4)).toMatch(BODY)
  })

  it("öneki alt çizgisiz de kabul eder", () => {
    expect(newPublicId("prod")).toMatch(/^prod_[0-9A-HJKMNP-TV-Z]{10}$/)
  })

  it("haritada olmayan öneki reddeder", () => {
    expect(() => newPublicId("zzz_")).toThrow(/önek haritada yok/)
    expect(() => newPublicId("1x_")).toThrow(/geçersiz önek/)
    expect(() => newPublicId("chn")).not.toThrow()
  })

  it("10 000 üretimde çakışma yok", () => {
    const ids = new Set<string>()
    for (let i = 0; i < 10_000; i += 1) ids.add(newPublicId("ord_"))
    expect(ids.size).toBe(10_000)
  })

  it("rastgelelik enjekte edilebilir (aynı bayt → aynı kimlik)", () => {
    expect(newPublicId("aud_", fixed(0))).toBe("aud_0000000000")
    expect(newPublicId("aud_", fixed(0))).toBe(newPublicId("aud_", fixed(0)))
  })
})

describe("parsePublicId / isPublicId", () => {
  it("önek ve gövdeyi ayırır", () => {
    expect(parsePublicId("chn_0123456789")).toEqual({ prefix: "chn_", body: "0123456789" })
  })

  it("yanlış öneki reddeder", () => {
    expect(parsePublicId("zzz_0123456789")).toBeNull()
    expect(parsePublicId("0123456789")).toBeNull()
    expect(isPublicId("ord_0123456789", "chn")).toBe(false)
    expect(isPublicId("chn_0123456789", "chn_")).toBe(true)
  })

  it("küçük harfli gövdeyi ve yasak karakterleri reddeder", () => {
    expect(isPublicId("chn_abcdefghij")).toBe(false)
    expect(isPublicId("chn_012345678O")).toBe(false) // O yasak
    expect(isPublicId("chn_012345678I")).toBe(false) // I yasak
    expect(isPublicId("chn_012345678U")).toBe(false) // U yasak
    expect(isPublicId("chn_01234567-9")).toBe(false)
  })

  it("uzunluk ve tip denetimi", () => {
    expect(isPublicId("chn_012345678")).toBe(false) // 9 karakter
    expect(isPublicId("chn_01234567890")).toBe(false) // 11 karakter
    expect(isPublicId(42)).toBe(false)
    expect(isPublicId(null)).toBe(false)
    expect(isPublicId(undefined)).toBe(false)
  })

  it("normalizePrefix alt çizgiyi ekler", () => {
    expect(normalizePrefix("chn")).toBe("chn_")
    expect(normalizePrefix("chn_")).toBe("chn_")
    expect(() => normalizePrefix("")).toThrow(RangeError)
  })
})
