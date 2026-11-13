import { describe, expect, it } from "vitest"
import { buildIndexRows } from "./buildIndexRows"
import { buildIndex, buildProductView } from "./buildProductView"
import { resolveVariantImages } from "./resolveVariantImages"
import type { ProductSource, SourceAsset, SourceVariant } from "./types"

const img = (key: string) => ({ key, width: null, height: null, sizes: [] })
const variant = (id: number, over: Partial<SourceVariant> = {}): SourceVariant => ({
  id,
  publicId: `var_${id}`,
  sku: `SKU-${id}`,
  leadTimeDays: null,
  trackInventory: true,
  baseVariantId: null,
  unitFactor: 1,
  channelIds: [1],
  optionValueIds: [],
  facetValueIds: [],
  collectionIds: [],
  ...over,
})

function source(over: Partial<ProductSource> = {}): ProductSource {
  return {
    id: 7,
    publicId: "prod_7",
    createdAt: 100,
    personalization: null,
    translations: [
      { lang: "tr", channelId: null, name: "Işık", slug: "isik", description: "<p>Güzel  lamba</p>" },
      { lang: "en", channelId: null, name: "Lamp", slug: "lamp", description: null },
    ].map((t) => ({ ...t, seoTitle: null, seoDescription: null })),
    variants: [
      variant(11, { facetValueIds: [3], collectionIds: [50], optionValueIds: [101] }),
      variant(10, { facetValueIds: [2], collectionIds: [50, 51] }),
      variant(12, { channelIds: [2] }),
    ],
    productFacetValueIds: [1, 9],
    facetValues: [
      { id: 1, facetCode: "brand", code: "acme", private: false, facetNames: {}, names: { tr: "Akme" } },
      { id: 2, facetCode: "color", code: "red", private: false, facetNames: {}, names: {} },
      { id: 3, facetCode: "color", code: "blue", private: false, facetNames: {}, names: {} },
      { id: 9, facetCode: "supplier", code: "x", private: true, facetNames: {}, names: {} },
    ],
    options: [],
    assets: [],
    channels: [{ id: 1, langs: ["tr", "en", "de"], currency: "TRY" }],
    prices: [
      { channelId: 1, variantId: 10, minQty: 1, amount: 500 },
      { channelId: 1, variantId: 10, minQty: 10, amount: 400 },
      { channelId: 1, variantId: 11, minQty: 1, amount: 900 },
      { channelId: 2, variantId: 11, minQty: 1, amount: 1 },
    ],
    available: { 10: 0, 11: 3 },
    collectionChannels: { 50: [1], 51: [2] },
    ...over,
  }
}

describe("buildIndexRows", () => {
  it("one row per channel variant and translated language; group_first on the lowest id", () => {
    const { rows } = buildIndexRows(source(), { id: 1, langs: ["tr", "en", "de"], currency: "TRY" })
    expect(rows.map((r) => [r.lang, r.variantId, r.groupFirst])).toEqual([
      ["tr", 10, true],
      ["tr", 11, false],
      ["en", 10, true],
      ["en", 11, false],
    ])
  })

  it("group_first carries the product range, others their own tier range", () => {
    const [first, second] = buildIndexRows(source(), source().channels[0] as never).rows
    expect(first).toMatchObject({ priceMin: 400, priceMax: 900, currency: "TRY" })
    expect(second).toMatchObject({ priceMin: 900, priceMax: 900 })
  })

  it("stock bucket per variant; untracked is in stock, a bundle divides its base", () => {
    const s = source({
      variants: [variant(10), variant(11, { trackInventory: false }), variant(13, { baseVariantId: 20, unitFactor: 12 })],
      available: { 10: 0, 20: 25 },
    })
    const rows = buildIndexRows(s, { id: 1, langs: ["en"], currency: "TRY" }).rows
    expect(rows.map((r) => r.stockBucket)).toEqual(["out", "in_stock", "low"])
  })

  it("private facets excluded; match rows point at the group_first variant", () => {
    const built = buildIndexRows(source(), { id: 1, langs: ["en"], currency: "TRY" })
    expect(built.rows[0]?.facetValueIds).toEqual([1, 2, 3])
    expect(built.rows[1]?.facetValueIds).toEqual([1, 3])
    expect(built.facets).toEqual([1, 2, 3].map((id) => ({ channelId: 1, id, variantId: 10 })))
    // collection 51 is not visible in channel 1
    expect(built.collections).toEqual([{ channelId: 1, id: 50, variantId: 10 }])
  })

  it("only the group_first row has folded FTS text with every SKU", () => {
    const rows = buildIndexRows(source(), { id: 1, langs: ["tr"], currency: "TRY" }).rows
    expect(rows[0]?.fts).toEqual({
      name: "isik",
      sku: "sku-10 sku-11",
      facetText: "akme red blue",
      descriptionExcerpt: "guzel lamba",
    })
    expect(rows[0]?.sortName).toBe("isik")
    expect(rows[1]?.fts).toBeNull()
  })
})

describe("resolveVariantImages", () => {
  const assets: SourceAsset[] = [
    { variantId: null, optionValueId: null, position: 1, image: img("gallery-b") },
    { variantId: null, optionValueId: null, position: 0, image: img("gallery-a") },
    { variantId: null, optionValueId: 101, position: 0, image: img("red") },
    { variantId: 11, optionValueId: null, position: 0, image: img("own") },
  ]
  it("variant → option value → product gallery", () => {
    expect(resolveVariantImages(assets, { id: 11, optionValueIds: [101] })).toEqual([img("own")])
    expect(resolveVariantImages(assets, { id: 12, optionValueIds: [101] })).toEqual([img("red")])
    expect(resolveVariantImages(assets, { id: 12, optionValueIds: [] })).toEqual([
      img("gallery-a"),
      img("gallery-b"),
    ])
  })
})

describe("buildProductView", () => {
  it("hreflang, public facets, variant tiers; no private facet or internal id", () => {
    const view = buildProductView(source(), source().channels[0] as never, "en")
    expect(view).toMatchObject({ channelId: 1, lang: "en", slug: "lamp", productId: 7 })
    expect(view?.data).toMatchObject({
      product: "prod_7",
      hreflang: [
        { lang: "tr", slug: "isik" },
        { lang: "en", slug: "lamp" },
      ],
      price: { min: 400, max: 900, currency: "TRY" },
    })
    const json = JSON.stringify(view?.data)
    expect(json).not.toContain("supplier")
    expect(json).toContain('"prices":[{"minQty":1,"amount":500},{"minQty":10,"amount":400}]')
  })

  it("buildIndex skips languages without a translation", () => {
    const built = buildIndex(source())
    expect(built.views.map((v) => v.lang)).toEqual(["tr", "en"])
    expect(buildProductView(source(), { id: 3, langs: ["en"], currency: "USD" }, "en")).toBeNull()
  })
})
