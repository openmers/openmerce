import { describe, expect, it } from "vitest"
import type { Parcel } from "../types"
import { desi } from "./desi"
import { flat } from "./flat"
import { freeOver } from "./freeOver"
import { tierArgs } from "./tiers"
import { weightTier } from "./weightTier"

const parcel = (over: Partial<Parcel> = {}): Parcel => ({
  weightGrams: 0,
  volumeMm3: 0,
  subtotal: 0,
  ...over,
})

const tiers = [
  { upTo: 1000, amount: 100 },
  { upTo: 5000, amount: 250 },
]

describe("hesaplayıcılar", () => {
  it("flat sabit ücret", () => {
    expect(flat.calculate({ amount: 499 }, parcel({ weightGrams: null }))).toEqual({
      ok: true,
      amount: 499,
    })
  })

  it("weightTier: sınır dahil, kademeler birikmez, sonlu son kademenin üstü uygun değil", () => {
    const at = (g: number) => weightTier.calculate({ tiers }, parcel({ weightGrams: g }))
    expect(at(0)).toEqual({ ok: true, amount: 100 })
    expect(at(1000)).toEqual({ ok: true, amount: 100 })
    expect(at(1001)).toEqual({ ok: true, amount: 250 }) // 100 + 250 değil
    expect(at(5000)).toEqual({ ok: true, amount: 250 })
    expect(at(5001)).toEqual({ ok: false, reason: "out_of_range" })
    const open = [...tiers, { upTo: null, amount: 900 }]
    expect(weightTier.calculate({ tiers: open }, parcel({ weightGrams: 99_999 }))).toEqual({
      ok: true,
      amount: 900,
    })
  })

  it("weightTier: bilinmeyen ağırlık 0 sayılmaz; yedek ücret ya da uygun değil", () => {
    const unknown = parcel({ weightGrams: null })
    expect(weightTier.calculate({ tiers }, unknown)).toEqual({
      ok: false,
      reason: "unknown_weight",
    })
    expect(weightTier.calculate({ tiers, fallbackAmount: 700 }, unknown)).toEqual({
      ok: true,
      amount: 700,
    })
  })

  it("desi: hacim / bölen, sınır dahil", () => {
    const args = {
      divisor: 3000,
      tiers: [
        { upTo: 2, amount: 100 },
        { upTo: 5, amount: 200 },
      ],
    }
    // 300 × 200 × 100 mm = 6000 cm³ = 2 desi
    expect(desi.calculate(args, parcel({ volumeMm3: 6_000_000 }))).toEqual({
      ok: true,
      amount: 100,
    })
    expect(desi.calculate(args, parcel({ volumeMm3: 6_000_001 }))).toEqual({
      ok: true,
      amount: 200,
    })
    expect(desi.calculate(args, parcel({ volumeMm3: 15_000_001 }))).toEqual({
      ok: false,
      reason: "out_of_range",
    })
    expect(desi.calculate(args, parcel({ volumeMm3: null }))).toEqual({
      ok: false,
      reason: "unknown_size",
    })
  })

  it("freeOver: eşikte ücretsiz", () => {
    const args = { threshold: 50_000, amount: 300 }
    expect(freeOver.calculate(args, parcel({ subtotal: 49_999 }))).toEqual({
      ok: true,
      amount: 300,
    })
    expect(freeOver.calculate(args, parcel({ subtotal: 50_000 }))).toEqual({ ok: true, amount: 0 })
  })

  it("kademe argümanı: artan sıra, sınırsız yalnız sonda", () => {
    expect(tierArgs.safeParse(tiers).success).toBe(true)
    expect(tierArgs.safeParse([...tiers].reverse()).success).toBe(false)
    expect(tierArgs.safeParse([{ upTo: null, amount: 1 }, ...tiers]).success).toBe(false)
    expect(tierArgs.safeParse([]).success).toBe(false)
  })
})
