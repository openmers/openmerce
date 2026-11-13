import { describe, expect, it } from "vitest"
import type { CompiledPromotion } from "../../promotions"
import type { CartData, CartLineData } from "../queries/cartData"
import { calculate } from "./calculate"
import type { CalcConfig } from "./types"

const NOW = 1_700_000_000_000
const ENGRAVING = {
  enabled: true,
  fields: [{ key: "engraving", type: "text" }],
  surcharge: [{ when: "engraving", amount: { USD: 1000, EUR: 900 } }],
}

function line(id: number, over: Partial<CartLineData> = {}): CartLineData {
  return {
    id,
    variantId: id,
    variantPublicId: `var_${id}`,
    productId: id,
    quantity: 1,
    lineKey: "",
    personalization: null,
    customFields: null,
    productPersonalization: ENGRAVING,
    variantPersonalization: null,
    taxCategoryId: 1,
    physical: true,
    trackInventory: true,
    weight: 500,
    length: null,
    width: null,
    height: null,
    ...over,
  }
}

function data(lines: CartLineData[], currency = "USD"): CartData {
  const price = (variantId: number, amount: number, cur: string) => ({
    variantId,
    priceList: `prl_${cur}`,
    type: "base" as const,
    priority: 0,
    startsAt: null,
    endsAt: null,
    status: "active" as const,
    includesTax: false,
    minQty: 1,
    amount,
    compareAtAmount: null,
    currency: cur,
  })
  return {
    cart: {
      id: 1,
      publicId: "cart_1",
      channelId: 1,
      customerId: null,
      companyId: null,
      status: "active",
      currency,
      shippingAddress: { country_code: "DE" },
      billingAddress: null,
      shippingMethodId: 7,
      couponCodes: [],
      email: null,
      version: 0,
    },
    lines,
    prices: [price(1, 5000, "USD"), price(2, 3333, "USD"), price(1, 4500, "EUR")],
    stock: [],
    promoData: {},
  }
}

/** 10% off every line; optional shipping discount. */
function tenPercent(shippingOff = 0): CompiledPromotion {
  return {
    id: 1,
    publicId: "prm_1",
    name: "10",
    priority: 0,
    startsAt: null,
    endsAt: null,
    couponCode: null,
    usageLimit: null,
    perCustomerLimit: null,
    used: 0,
    stackable: true,
    applyToContract: false,
    channelIds: new Set([1]),
    conditions: [],
    actions: [
      (s) => [
        ...s.lines.map((l) => ({
          target: "line" as const,
          lineKey: l.line.key,
          amount: Math.round(l.remaining / 10),
        })),
        { target: "shipping" as const, amount: shippingOff },
      ],
    ],
    requires: [],
  }
}

function config(promotions: CompiledPromotion[] = []): CalcConfig {
  return {
    channel: { id: 1, defaultTaxZoneId: null, pricesIncludeTax: false },
    promotions,
    shippingMethods: [
      {
        id: 7,
        publicId: "shm_7",
        name: "Flat",
        zoneId: null,
        checkerCode: null,
        checkerArgs: null,
        calculatorCode: "flat",
        calculatorArgs: { amount: 500 },
        taxCategoryId: 1,
        pickupLocationId: null,
        channelIds: [1],
      },
    ],
    tax: {
      zones: [{ id: 1, publicId: "zon_1", name: "DE", members: [{ country: "DE", region: null }] }],
      categories: [{ id: 1, code: "standard", name: "Standard" }],
      rates: [
        {
          id: 1,
          publicId: "txr_1",
          zoneId: 1,
          taxCategoryId: 1,
          customerGroupId: null,
          rateBp: 1900,
        },
      ],
    },
    now: NOW,
  }
}

describe("calculate", () => {
  it("totals are the sum of lines (and the shipping line); net + tax = gross", () => {
    const t = calculate(data([line(1, { quantity: 2 }), line(2, { quantity: 3 })]), config())
    expect(t.lines.map((l) => l.amount)).toEqual([10_000, 9999])
    expect(t.shipping).toMatchObject({ methodId: 7, amount: 500, tax: 95, gross: 595 })
    const sum = (k: "net" | "tax" | "gross") =>
      t.lines.reduce((n, l) => n + l[k], 0) + t.shipping[k]
    expect([t.net, t.tax, t.gross]).toEqual([sum("net"), sum("tax"), sum("gross")])
    expect(t.net + t.tax).toBe(t.gross)
    expect(t.subtotal).toBe(19_999)
  })

  it("surcharge is added to list price, promotion applies to the total, tax at the line rate", () => {
    const engraved = line(1, { personalization: { engraving: "Ada" }, lineKey: "a".repeat(32) })
    const t = calculate(data([engraved]), config([tenPercent(100)]))
    const l = t.lines[0]
    expect(l).toMatchObject({
      baseUnitPrice: 5000,
      surcharge: 1000,
      unitPrice: 6000,
      discount: 600,
    })
    expect(l).toMatchObject({ net: 5400, tax: 1026, gross: 6426 })
    expect(t.shipping).toMatchObject({ amount: 500, discount: 100, net: 400 })
    expect(t.discount).toBe(700)
    expect(t.promotions).toEqual([{ promotionId: 1, effective: true, discount: 700 }])
  })

  it("multi-currency surcharge: EUR price + EUR surcharge; currency without surcharge is unpriced", () => {
    const engraved = line(1, { personalization: { engraving: "Ada" } })
    const eur = calculate(data([engraved], "EUR"), config())
    expect(eur.lines[0]).toMatchObject({ baseUnitPrice: 4500, surcharge: 900, unitPrice: 5400 })

    const noEur = {
      ...ENGRAVING,
      surcharge: [{ when: "engraving", amount: 1000, currency: "USD" }],
    }
    const t = calculate(data([{ ...engraved, productPersonalization: noEur }], "EUR"), config())
    expect(t.unavailable).toEqual([{ lineId: 1, reason: "NO_PRICE" }])
    expect(t.lines).toEqual([])
  })

  it("ineligible selected method gives shipping 0 and null method; digital cart needs no shipping", () => {
    const d = data([line(1)])
    d.cart.shippingMethodId = 99
    expect(calculate(d, config()).shipping).toMatchObject({ methodId: null, gross: 0 })
    const digital = calculate(data([line(1, { physical: false })]), config())
    expect(digital.shipping).toMatchObject({ needsShipping: false, gross: 0 })
  })
})
