import { describe, expect, it } from "vitest"
import { compilePromotions, type PromotionRow } from "../registry/compilePromotions"
import type { PromoCart, PromoLine } from "../types"
import { applyPromotions } from "./applyPromotions"

const NOW = 1_700_000_000_000
const CH = 1

const row = (id: number, over: Partial<PromotionRow> = {}): PromotionRow => ({
  id,
  publicId: `prm_${id}`,
  name: `p${id}`,
  startsAt: null,
  endsAt: null,
  enabled: true,
  priority: 0,
  couponCode: null,
  usageLimit: null,
  perCustomerLimit: null,
  used: 0,
  conditions: [],
  actions: [],
  stackable: true,
  applyToContract: false,
  version: 0,
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
})

const line = (key: string, amount: number, over: Partial<PromoLine> = {}): PromoLine => ({
  key,
  variantId: 1,
  productId: 1,
  quantity: 1,
  amount,
  priceType: "base",
  ...over,
})

const cart = (over: Partial<PromoCart> = {}): PromoCart => ({
  channelId: CH,
  lines: [line("a", 1000), line("b", 3000)],
  shipping: 500,
  customerId: null,
  customerGroupIds: [],
  companyId: null,
  couponCodes: [],
  data: {},
  ...over,
})

function run(rows: PromotionRow[], c: PromoCart = cart(), now = NOW) {
  const compiled = compilePromotions(
    rows,
    rows.map((r) => ({ promotionId: r.id, channelId: CH })),
  )
  expect(compiled.invalid).toEqual([])
  return applyPromotions({ promotions: compiled.byChannel.get(CH) ?? [], cart: c, now })
}

const pct = (bp: number) => [{ code: "linePercent", args: { bp } }]

describe("applyPromotions", () => {
  it("priority order; an effective non-stackable promotion cuts off the rest", () => {
    const r = run([
      row(1, { priority: 1, actions: pct(1000) }),
      row(2, { priority: 5, actions: pct(5000), stackable: false }),
    ])
    expect(r.results).toEqual([{ promotionId: 2, effective: true, discount: 2000 }])
    expect(r.lineDiscounts).toEqual({ a: 500, b: 1500 })
  })

  it("stackable promotions accumulate on the remaining amount, a line never goes negative", () => {
    const r = run([
      row(1, { priority: 2, actions: pct(5000) }),
      row(2, { priority: 1, actions: [{ code: "lineAmount", args: { amount: 900 } }] }),
    ])
    expect(r.lineDiscounts).toEqual({ a: 1000, b: 2400 }) // a: 500 + min(500, 900)
    expect(r.results.map((x) => x.discount)).toEqual([2000, 1400])
  })

  it("a contract line is skipped; applied if applyToContract is on", () => {
    const c = cart({ lines: [line("a", 1000, { priceType: "contract" }), line("b", 1000)] })
    expect(run([row(1, { actions: pct(1000) })], c).lineDiscounts).toEqual({ a: 0, b: 100 })
    expect(run([row(1, { actions: pct(1000), applyToContract: true })], c).lineDiscounts).toEqual({
      a: 100,
      b: 100,
    })
    // the condition does not see the contract line either
    const minAll = [{ code: "minAmount", args: { amount: 1500 } }]
    expect(run([row(1, { conditions: minAll, actions: pct(1000) })], c).results).toEqual([])
  })

  it("a 0 discount has no effect: does not consume the counter and does not cut off even if not stackable", () => {
    const r = run(
      [
        row(1, {
          priority: 9,
          stackable: false,
          actions: [{ code: "shippingPercent", args: { bp: 10_000 } }],
        }),
        row(2, { actions: pct(1000) }),
      ],
      cart({ shipping: 0 }),
    )
    expect(r.results).toEqual([
      { promotionId: 1, effective: false, discount: 0 },
      { promotionId: 2, effective: true, discount: 400 },
    ])
    expect(r.adjustments.every((a) => a.amount > 0)).toBe(true)
  })

  it("an order discount is distributed proportionally across lines; the shipping discount is separate", () => {
    const r = run([
      row(1, {
        actions: [
          { code: "orderAmount", args: { amount: 1001 } },
          { code: "shippingPercent", args: { bp: 5000 } },
        ],
      }),
    ])
    expect(r.lineDiscounts).toEqual({ a: 250, b: 751 })
    expect(r.shippingDiscount).toBe(250)
    expect(r.adjustments.map((a) => a.target)).toEqual(["order", "shipping"])
  })

  it("date, channel, coupon and exhausted limit are filtered", () => {
    const rows = [
      row(1, { startsAt: NOW + 1, actions: pct(1000) }),
      row(2, { endsAt: NOW, actions: pct(1000) }),
      row(3, { couponCode: "SUMMER", actions: pct(1000) }),
      row(4, { usageLimit: 3, used: 3, actions: pct(1000) }),
    ]
    expect(run(rows).results).toEqual([])
    expect(
      run(rows, cart({ couponCodes: [" summer "] })).results.map((x) => x.promotionId),
    ).toEqual([3])
    expect(run(rows, cart({ channelId: 2, couponCodes: ["SUMMER"] })).results).toEqual([])
  })

  it("conditions: first order from requires data, group and product", () => {
    const first = row(1, { conditions: [{ code: "firstOrder", args: {} }], actions: pct(1000) })
    expect(first.conditions).toHaveLength(1)
    expect(run([first], cart({ data: { customerOrderCount: 0 } })).results).toHaveLength(1)
    expect(run([first], cart({ data: { customerOrderCount: 2 } })).results).toHaveLength(0)
    expect(run([first]).results).toHaveLength(0) // guest: no data

    const group = row(2, { conditions: [{ code: "customerGroup", args: { groupIds: [7] } }] })
    const withAction = { ...group, actions: pct(1000) }
    expect(run([withAction], cart({ customerGroupIds: [7] })).results).toHaveLength(1)
    expect(run([withAction]).results).toHaveLength(0)

    const product = row(3, {
      conditions: [{ code: "containsProducts", args: { productIds: [9], minQuantity: 2 } }],
      actions: [{ code: "linePercent", args: { bp: 10_000, productIds: [9] } }],
    })
    const c = cart({ lines: [line("a", 1000), line("b", 600, { productId: 9, quantity: 2 })] })
    expect(run([product], c).lineDiscounts).toEqual({ a: 0, b: 600 })
  })

  it("an unknown code and invalid arguments do not compile", () => {
    const { invalid, byChannel } = compilePromotions(
      [row(1, { actions: [{ code: "nope", args: {} }] }), row(2, { actions: pct(0) })],
      [
        { promotionId: 1, channelId: CH },
        { promotionId: 2, channelId: CH },
      ],
    )
    expect(invalid.map((x) => x.id)).toEqual([1, 2])
    expect(byChannel.size).toBe(0)
  })
})
