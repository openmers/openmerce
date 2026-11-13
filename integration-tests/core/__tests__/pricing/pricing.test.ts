import {
  createPriceList,
  createProduct,
  deletePriceList,
  getPrices,
  getPricesQuery,
  getProduct,
  getRate,
  listPriceLists,
  resolvePrice,
  SET_PRICES_MAX,
  setPrices,
  setRate,
  updatePriceList,
} from "@openmers/core"
import { assertNoFullScan, describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { sqlitePlatform } from "../../../../packages/core/src/features/__testing__/sqlitePlatform"
import { catalogCtx, NOW, seedChannel, seedTaxCategory } from "../catalog/helpers"
import { scalar } from "../helpers"

describeOnTargets("fiyat", (getDb) => {
  const prepare = async () => {
    const p = sqlitePlatform(getDb())
    const channel = await seedChannel(p)
    seedTaxCategory(getDb())
    const ctx = catalogCtx(p, channel)
    const product = await createProduct(ctx, {
      translations: [{ lang: "en", name: "Kalem", slug: "kalem" }],
      variants: [
        { sku: "K-1", taxCategoryCode: "standard" },
        { sku: "K-2", taxCategoryCode: "standard" },
      ],
    })
    const variants = (await getProduct(ctx, product.publicId))?.variants.map((v) => v.publicId)
    const [a, b] = variants as [string, string]
    const base = await createPriceList(ctx, {
      name: "Base",
      currency: "USD",
      type: "base",
      includesTax: true,
    })
    return { p, ctx, product: product.publicId, a, b, base: base.publicId }
  }

  it("list: second base CONFLICT, broken window INVALID_INPUT, base cannot be deleted", async () => {
    const { ctx, base } = await prepare()
    const again = { name: "B2", currency: "USD", type: "base" as const, includesTax: true }
    await expect(createPriceList(ctx, again)).rejects.toMatchObject({ code: "CONFLICT" })
    await expect(createPriceList(ctx, { ...again, currency: "usd" })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    })
    const sale = await createPriceList(ctx, {
      ...again,
      type: "sale",
      priority: 3,
      startsAt: NOW,
      endsAt: NOW + 10,
    })
    await expect(
      updatePriceList(ctx, { publicId: sale.publicId, patch: { startsAt: NOW + 10 } }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" })
    await updatePriceList(ctx, { publicId: sale.publicId, patch: { name: "Yaz", priority: 7 } })
    expect((await listPriceLists(ctx)).map((l) => [l.type, l.name, l.priority])).toEqual([
      ["base", "Base", 0],
      ["sale", "Yaz", 7],
    ])
    await expect(deletePriceList(ctx, { publicId: base })).rejects.toMatchObject({
      code: "CONFLICT",
    })
    await expect(deletePriceList(ctx, { publicId: "pl_yok" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
    await deletePriceList(ctx, { publicId: sale.publicId })
    expect(await listPriceLists(ctx)).toHaveLength(1)
  })

  it("bulk write: per-entry result, upper limit, idempotent, currency from the list", async () => {
    const { ctx, a, b, base } = await prepare()
    const items = [
      { variantPublicId: a, amount: 1000, compareAtAmount: 1200 },
      { variantPublicId: a, minQty: 10, amount: 900 },
      { variantPublicId: b, amount: 10.5 },
      { variantPublicId: "var_yok", amount: 1 },
      { variantPublicId: a, amount: 5 },
    ]
    const first = await setPrices(ctx, { priceListPublicId: base, items })
    expect(first.map((r) => (r.ok ? "ok" : r.code))).toEqual([
      "ok",
      "ok",
      "INVALID_INPUT",
      "NOT_FOUND",
      "INVALID_INPUT",
    ])
    const again = await setPrices(ctx, { priceListPublicId: base, items })
    expect(again).toEqual(first)
    expect(scalar<number>(getDb(), "SELECT count(*) FROM prices")).toBe(2)
    expect(scalar(getDb(), "SELECT currency FROM prices LIMIT 1")).toBe("USD")

    const tooMany = Array.from({ length: SET_PRICES_MAX + 1 }, () => items[0] as never)
    await expect(setPrices(ctx, { priceListPublicId: base, items: tooMany })).rejects.toMatchObject(
      { code: "INVALID_INPUT" },
    )
    await expect(
      setPrices(ctx, { priceListPublicId: "pl_yok", items: [items[0] as never] }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("writing to the default list creates a reindex job, writing to another list does not", async () => {
    const { ctx, a, product, base } = await prepare()
    const sale = await createPriceList(ctx, {
      name: "Sale",
      currency: "USD",
      type: "sale",
      includesTax: true,
    })
    getDb().prepare("DELETE FROM outbox").run()
    await setPrices(ctx, {
      priceListPublicId: sale.publicId,
      items: [{ variantPublicId: a, amount: 1 }],
    })
    expect(scalar<number>(getDb(), "SELECT count(*) FROM outbox")).toBe(0)
    getDb()
      .prepare(
        "UPDATE channels SET default_price_list_id = (SELECT id FROM price_lists WHERE public_id = ?)",
      )
      .run(base)
    await setPrices(ctx, { priceListPublicId: base, items: [{ variantPublicId: a, amount: 2 }] })
    expect(scalar(getDb(), "SELECT dedupe_key FROM outbox WHERE kind = 'reindex'")).toBe(
      `product:${product}`,
    )
  })

  it("read is one query walking the PK; resolution by priority/tier/none", async () => {
    const { p, ctx, a, b, base } = await prepare()
    const sale = await createPriceList(ctx, {
      name: "Sale",
      currency: "USD",
      type: "sale",
      includesTax: true,
      endsAt: NOW + 1000,
    })
    await setPrices(ctx, {
      priceListPublicId: base,
      items: [
        { variantPublicId: a, amount: 1000 },
        { variantPublicId: a, minQty: 10, amount: 900 },
      ],
    })
    await setPrices(ctx, {
      priceListPublicId: sale.publicId,
      items: [{ variantPublicId: a, amount: 950 }],
    })
    const rows = await getPrices(ctx, { variantPublicIds: [a, b] })
    expect(rows).toHaveLength(3)
    expect(JSON.stringify(rows)).not.toMatch(/"id":/)
    const resolve = (quantity: number, now = NOW) =>
      resolvePrice({ candidates: rows, quantity, currency: "USD", now })
    expect(resolve(1)).toMatchObject({ ok: true, price: { amount: 950, type: "sale" } })
    expect(resolve(10, NOW + 1000)).toMatchObject({ ok: true, price: { amount: 900, minQty: 10 } })
    const forB = await getPrices(ctx, { variantPublicIds: [b], priceListPublicIds: [base] })
    expect(resolvePrice({ candidates: forB, quantity: 1, currency: "USD", now: NOW })).toEqual({
      ok: false,
      code: "NO_PRICE",
    })
    assertNoFullScan(
      getDb(),
      getPricesQuery(p.db, ctx.channel.id, { variantPublicIds: [a] }).toSQL(),
    )
    assertNoFullScan(
      getDb(),
      getPricesQuery(p.db, ctx.channel.id, {
        variantPublicIds: [a, b],
        priceListPublicIds: [base],
      }).toSQL(),
    )
  })

  it("exchange rate: upsert per day, null if missing (no guessing)", async () => {
    const { p } = await prepare()
    const rate = {
      day: "2026-11-13",
      base: "USD",
      quote: "TRY",
      rateE9: 34_000_000_000,
      source: "manual",
    }
    await setRate(p, rate, NOW)
    await setRate(p, { ...rate, rateE9: 34_500_000_000 }, NOW + 1)
    expect(await getRate(p, rate)).toBe(34_500_000_000)
    expect(await getRate(p, { ...rate, day: "2026-11-12" })).toBeNull()
    await expect(setRate(p, { ...rate, rateE9: 1.5 }, NOW)).rejects.toMatchObject({
      code: "INVALID_INPUT",
    })
  })
})
