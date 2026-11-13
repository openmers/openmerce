import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  listProductsQuery,
} from "@openmers/core"
import { assertNoFullScan, describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { sqlitePlatform } from "../../../../packages/core/src/features/__testing__/sqlitePlatform"
import { catalogCtx, NOW, productWithFourVariants, seedChannel, seedTaxCategory } from "./helpers"

describeOnTargets("catalog admin queries", (getDb) => {
  const prepare = async () => {
    const p = sqlitePlatform(getDb())
    const channel = await seedChannel(p)
    seedTaxCategory(getDb())
    return { p, ctx: catalogCtx(p, channel) }
  }

  it("listProducts paginates with a cursor, descends by update order, does not leak internal ids", async () => {
    const { p, ctx } = await prepare()
    const ids: string[] = []
    for (const [i, suffix] of ["a", "b", "c"].entries()) {
      const created = await createProduct(catalogCtx(p, ctx.channel, { now: NOW + i }), {
        translations: [{ lang: "en", name: `Ürün ${suffix}`, slug: `urun-${suffix}` }],
        variants: [{ sku: `SKU-${suffix}`, taxCategoryCode: "standard" }],
      })
      ids.push(created.publicId)
    }

    const first = await listProducts(ctx, { limit: 2 })
    expect(first.items).toHaveLength(2)
    expect(first.items.map((item) => item.publicId)).toEqual([ids[2], ids[1]])
    expect(first.items[0]).toMatchObject({ name: "Ürün c", slug: "urun-c" })
    expect(first.nextCursor).toBe(`${NOW + 1}:${ids[1]}`)

    const second = await listProducts(ctx, { limit: 2, cursor: first.nextCursor ?? undefined })
    expect(second.items.map((item) => item.publicId)).toEqual([ids[0]])
    expect(second.nextCursor).toBeNull()
    expect(JSON.stringify([first, second])).not.toMatch(/"id":\d/)
  })

  it("the list query walks the index (no full scan) and an invalid cursor is rejected", async () => {
    const { p, ctx } = await prepare()
    await createProduct(ctx, productWithFourVariants())
    assertNoFullScan(getDb(), listProductsQuery(p.db).toSQL())
    assertNoFullScan(
      getDb(),
      listProductsQuery(p.db, { cursor: `${NOW}:prod_AAAAAAAAAA`, limit: 2 }).toSQL(),
    )
    await expect(listProducts(ctx, { cursor: "çöp" })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    })
  })

  it("getProduct does not return a soft-deleted product; the list does not show it either", async () => {
    const { ctx } = await prepare()
    const created = await createProduct(ctx, productWithFourVariants())
    expect(await getProduct(ctx, "prod_yok")).toBeNull()
    await deleteProduct(ctx, { publicId: created.publicId, version: 0 })
    expect(await getProduct(ctx, created.publicId)).toBeNull()
    expect((await listProducts(ctx)).items).toEqual([])
  })
})
