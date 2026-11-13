import { describe, expect, it } from "vitest"
import { type PriceCandidate, resolvePrice } from "./resolvePrice"

const NOW = 1_700_000_000_000

function row(over: Partial<PriceCandidate>): PriceCandidate {
  return {
    priceList: "pl_base",
    type: "base",
    priority: 0,
    startsAt: null,
    endsAt: null,
    status: "active",
    minQty: 1,
    amount: 1000,
    compareAtAmount: null,
    currency: "USD",
    ...over,
  }
}

const pick = (candidates: PriceCandidate[], quantity = 1, extra = {}) =>
  resolvePrice({ candidates, quantity, currency: "USD", now: NOW, ...extra })

describe("resolvePrice", () => {
  it("type priority: contract → valid sale → base", () => {
    const base = row({})
    const sale = row({ priceList: "pl_sale", type: "sale", amount: 800 })
    const contract = row({ priceList: "pl_c", type: "contract", amount: 700 })
    expect(pick([base, sale, contract])).toMatchObject({ ok: true, price: { amount: 700 } })
    expect(pick([base, sale])).toMatchObject({ ok: true, price: { priceList: "pl_sale" } })
    expect(pick([base])).toMatchObject({ ok: true, price: { type: "base", amount: 1000 } })
  })

  it("an expired, not yet started or expired-status sale is skipped", () => {
    const base = row({})
    const ended = row({ priceList: "pl_s1", type: "sale", endsAt: NOW })
    const future = row({ priceList: "pl_s2", type: "sale", startsAt: NOW + 1 })
    const expired = row({ priceList: "pl_s3", type: "sale", status: "expired" })
    expect(pick([base, ended, future, expired])).toMatchObject({ price: { priceList: "pl_base" } })
    const live = row({ priceList: "pl_s4", type: "sale", startsAt: NOW, endsAt: NOW + 1 })
    expect(pick([base, live])).toMatchObject({ price: { priceList: "pl_s4" } })
  })

  it("within the same type higher priority wins, ties broken by public_id order", () => {
    const low = row({ priceList: "pl_a", type: "sale", priority: 1, amount: 1 })
    const high = row({ priceList: "pl_b", type: "sale", priority: 5, amount: 2 })
    expect(pick([low, high])).toMatchObject({ price: { priceList: "pl_b" } })
    const tie = row({ priceList: "pl_0", type: "sale", priority: 5, amount: 3 })
    expect(pick([high, tie])).toMatchObject({ price: { priceList: "pl_0" } })
  })

  it("tier: the highest min_qty matching the quantity; a non-matching tier is not a candidate", () => {
    const tiers = [1, 10, 50].map((minQty) => row({ minQty, amount: 1000 - minQty }))
    expect(pick(tiers, 9)).toMatchObject({ price: { minQty: 1 } })
    expect(pick(tiers, 10)).toMatchObject({ price: { minQty: 10 } })
    expect(pick(tiers, 49)).toMatchObject({ price: { minQty: 10 } })
    expect(pick(tiers, 500)).toMatchObject({ price: { minQty: 50, amount: 950 } })
  })

  it("if the upper list has no tier matching the quantity, falls back to the lower list", () => {
    const contract = row({ priceList: "pl_c", type: "contract", minQty: 100, amount: 1 })
    expect(pick([row({}), contract], 5)).toMatchObject({ price: { priceList: "pl_base" } })
    expect(pick([row({}), contract], 100)).toMatchObject({ price: { priceList: "pl_c" } })
  })

  it("a list outside the session set and another currency are not candidates", () => {
    const contract = row({ priceList: "pl_c", type: "contract", amount: 1 })
    expect(pick([row({}), contract], 1, { priceLists: ["pl_base"] })).toMatchObject({
      price: { priceList: "pl_base" },
    })
    expect(pick([row({ currency: "EUR" })])).toEqual({ ok: false, code: "NO_PRICE" })
  })

  it("no price gives NO_PRICE (not 0); an invalid quantity also gives NO_PRICE", () => {
    expect(pick([])).toEqual({ ok: false, code: "NO_PRICE" })
    expect(pick([row({ minQty: 10 })], 9)).toEqual({ ok: false, code: "NO_PRICE" })
    expect(pick([row({})], 0)).toEqual({ ok: false, code: "NO_PRICE" })
    expect(pick([row({})], 1.5)).toEqual({ ok: false, code: "NO_PRICE" })
  })
})
