import { describe, expect, it } from "vitest"
import type { Zone } from "../../tax/types"
import type { ShipLine, ShippingMethod } from "../types"
import { type QuoteInput, quoteShipping } from "./quoteShipping"

const CH = 1
const zones: Zone[] = [
  { id: 1, publicId: "zon_1", name: "DE", members: [{ country: "DE", region: null }] },
]

const method = (id: number, over: Partial<ShippingMethod> = {}): ShippingMethod => ({
  id,
  publicId: `shm_${id}`,
  name: `m${id}`,
  zoneId: null,
  checkerCode: null,
  checkerArgs: null,
  calculatorCode: "flat",
  calculatorArgs: { amount: 500 },
  taxCategoryId: 1,
  pickupLocationId: null,
  channelIds: [CH],
  ...over,
})

const item = (over: Partial<ShipLine> = {}): ShipLine => ({
  variantId: 1,
  quantity: 1,
  physical: true,
  weight: 400,
  length: 100,
  width: 100,
  height: 100,
  ...over,
})

const quote = (over: Partial<QuoteInput> = {}) =>
  quoteShipping({
    methods: [method(1)],
    channelId: CH,
    lines: [item()],
    address: { country: "DE" },
    zones,
    subtotal: 1000,
    stockAt: () => 0,
    ...over,
  })

describe("quoteShipping", () => {
  it("karma sepet: yalnız fiziksel kalemler tartılır", () => {
    const tierMethod = method(1, {
      calculatorCode: "weightTier",
      calculatorArgs: {
        tiers: [
          { upTo: 1000, amount: 100 },
          { upTo: 2000, amount: 200 },
        ],
      },
    })
    const q = quote({
      methods: [tierMethod],
      lines: [
        item({ quantity: 2 }), // 800 g
        item({ variantId: 2, physical: false, weight: null, length: null }), // dijital
      ],
    })
    expect(q.parcel.weightGrams).toBe(800)
    expect(q.parcel.volumeMm3).toBe(2_000_000)
    expect(q.options.map((o) => o.amount)).toEqual([100])
  })

  it("yalnız dijital kalem: kargo gerekmez", () => {
    const q = quote({ lines: [item({ physical: false })] })
    expect(q).toMatchObject({ needsShipping: false, options: [] })
  })

  it("bilinmeyen ağırlık sessizce 0 olmaz", () => {
    const q = quote({
      methods: [
        method(1, {
          calculatorCode: "weightTier",
          calculatorArgs: { tiers: [{ upTo: null, amount: 9 }] },
        }),
      ],
      lines: [item(), item({ variantId: 2, weight: null })],
    })
    expect(q.parcel.weightGrams).toBeNull()
    expect(q.options).toEqual([])
  })

  it("kanal, bölge, checker ve bilinmeyen hesaplayıcı süzülür; ücrete göre sıralı", () => {
    const q = quote({
      methods: [
        method(1, { calculatorArgs: { amount: 900 } }),
        method(2, { zoneId: 1, calculatorArgs: { amount: 300 } }),
        method(3, { channelIds: [2] }),
        method(4, { checkerCode: "app.custom" }),
        method(5, { calculatorCode: "app.liveRate" }),
        method(6, { calculatorArgs: { amount: -1 } }), // geçersiz argüman
      ],
    })
    expect(q.options.map((o) => o.methodId)).toEqual([2, 1])
    const fr = quote({ methods: [method(2, { zoneId: 1 })], address: { country: "FR" } })
    expect(fr.options).toEqual([])
    expect(quote({ methods: [method(2, { zoneId: 1 })], address: null }).options).toEqual([])
  })

  it("mağazadan teslim: depoda yeterli stok varsa, adres gerekmez", () => {
    const pickup = method(7, { pickupLocationId: 3, zoneId: 1, calculatorArgs: { amount: 0 } })
    const lines = [item({ quantity: 2 }), item({ quantity: 1 })] // aynı varyant: 3 adet
    const stock = (n: number) => (loc: number, variant: number) =>
      loc === 3 && variant === 1 ? n : 0
    expect(
      quote({ methods: [pickup], lines, address: null, stockAt: stock(3) }).options,
    ).toHaveLength(1)
    expect(quote({ methods: [pickup], lines, address: null, stockAt: stock(2) }).options).toEqual(
      [],
    )
  })
})
