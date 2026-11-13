import { describe, expect, it } from "vitest"
import type { TaxRate, Zone } from "../types"
import { taxLine } from "./taxLine"
import { taxZone } from "./taxZone"

const zone = (id: number, members: Zone["members"]): Zone => ({
  id,
  publicId: `zon_${id}`,
  name: `z${id}`,
  members,
})

const zones = [
  zone(1, [{ country: "DE", region: null }]),
  zone(2, [{ country: "DE", region: "DE-BY" }]),
  zone(3, [{ country: "FR", region: null }]),
  zone(4, [{ country: "FR", region: null }]),
]

describe("taxZone", () => {
  it("adres yokken kanal varsayılanı", () => {
    expect(taxZone({ zones, address: null, channelDefaultZoneId: 3 })).toBe(3)
    expect(taxZone({ zones, channelDefaultZoneId: null })).toBeNull()
  })

  it("alt bölge ülkeden özel; eşitlikte küçük id", () => {
    expect(
      taxZone({ zones, address: { country: "de", region: "de-by" }, channelDefaultZoneId: 3 }),
    ).toBe(2)
    expect(taxZone({ zones, address: { country: "DE" }, channelDefaultZoneId: 3 })).toBe(1)
    expect(taxZone({ zones, address: { country: "FR" }, channelDefaultZoneId: null })).toBe(3)
  })

  it("hiçbir bölge kapsamıyorsa kanal varsayılanı", () => {
    expect(taxZone({ zones, address: { country: "US" }, channelDefaultZoneId: 1 })).toBe(1)
  })
})

const rate = (id: number, over: Partial<TaxRate>): TaxRate => ({
  id,
  publicId: `txr_${id}`,
  zoneId: 1,
  taxCategoryId: 10,
  customerGroupId: null,
  rateBp: 2000,
  ...over,
})

describe("taxLine", () => {
  const rates = [
    rate(1, {}),
    rate(2, { customerGroupId: 7, rateBp: 0 }), // muaf grup
    rate(3, { customerGroupId: 8, rateBp: 500 }),
    rate(4, { taxCategoryId: 11, rateBp: 1000 }),
    rate(5, { zoneId: 2, rateBp: 1900 }),
  ]

  it("bölge + kategori oranı", () => {
    expect(taxLine({ rates, zoneId: 1, taxCategoryId: 10 })).toEqual([
      { taxRateId: 1, rateBp: 2000 },
    ])
    expect(taxLine({ rates, zoneId: 1, taxCategoryId: 11 })).toEqual([
      { taxRateId: 4, rateBp: 1000 },
    ])
    expect(taxLine({ rates, zoneId: 2, taxCategoryId: 10 })).toEqual([
      { taxRateId: 5, rateBp: 1900 },
    ])
  })

  it("grup muafiyeti genel oranın yerine geçer; birden çok grupta en düşük", () => {
    expect(taxLine({ rates, zoneId: 1, taxCategoryId: 10, customerGroupIds: [8] })).toEqual([
      { taxRateId: 3, rateBp: 500 },
    ])
    expect(taxLine({ rates, zoneId: 1, taxCategoryId: 10, customerGroupIds: [8, 7] })).toEqual([
      { taxRateId: 2, rateBp: 0 },
    ])
    // grubun bu kategoride oranı yok → genel oran
    expect(taxLine({ rates, zoneId: 1, taxCategoryId: 11, customerGroupIds: [7] })[0]?.rateBp).toBe(
      1000,
    )
  })

  it("bölge yok ya da oran yok → vergi satırı yok", () => {
    expect(taxLine({ rates, zoneId: null, taxCategoryId: 10 })).toEqual([])
    expect(taxLine({ rates, zoneId: 9, taxCategoryId: 10 })).toEqual([])
  })
})
