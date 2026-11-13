import {
  catalogIndexHandlers,
  deleteProduct,
  getProduct,
  getProductView,
  listFiltered,
  reindexProduct,
  removeVariant,
  runOutboxOnce,
  search,
  updateProduct,
} from "@openmers/core"
import { describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { catalogCtx, NOW } from "../catalog/helpers"
import { seedCatalog } from "./helpers"

describeOnTargets("catalog read model: reindex job", (getDb) => {
  it("writes every (channel, language) row and leaves no stale FTS row after a rewrite", async () => {
    const s = await seedCatalog(getDb())
    const lamp = await s.product("lamp", { en: "Lamp", tr: "Işık" }, ["L-1", "L-2"])
    await s.reindex(lamp)
    expect(s.count("catalog_index")).toBe(4)
    expect(s.count("catalog_fts")).toBe(2)
    expect(s.count("product_view")).toBe(2)

    const [first] = s.variantIds(lamp)
    const ctx = catalogCtx(s.p, s.channel)
    const variant = (await getProduct(ctx, lamp))?.variants[0]
    await removeVariant(ctx, {
      publicId: variant?.publicId ?? "",
      productPublicId: lamp,
      version: variant?.version ?? 0,
    })
    await s.reindex(lamp)
    expect(s.count("catalog_index")).toBe(2)
    expect(s.count("catalog_index WHERE variant_id = ?", first)).toBe(0)
    expect(s.count("catalog_fts WHERE rowid NOT IN (SELECT rowid FROM catalog_index)")).toBe(0)
    expect(s.count("catalog_fts")).toBe(2)
  })

  it("a failing write keeps the previous rows (single atomic)", async () => {
    const s = await seedCatalog(getDb())
    const lamp = await s.product("lamp", { en: "Lamp" }, ["L-1"])
    await s.reindex(lamp)
    await updateProduct(catalogCtx(s.p, s.channel), {
      publicId: lamp,
      version: 0,
      translations: [{ lang: "en", name: "Desk lamp", slug: "lamp" }],
      patch: {},
    })
    const broken = {
      ...s.p,
      atomic: (stmts: Parameters<typeof s.p.atomic>[0]) =>
        s.p.atomic([...stmts, { sql: "INSERT INTO no_such_table VALUES (1)", params: [] }]),
    }
    await expect(reindexProduct(broken, lamp)).rejects.toThrow(/no such table/)
    expect(s.count("catalog_index WHERE name = 'Lamp'")).toBe(1)
    expect(s.count("catalog_fts")).toBe(1)
  })

  it("reindex is deduplicated in the outbox and registered as its handler", async () => {
    const s = await seedCatalog(getDb())
    const lamp = await s.product("lamp", { en: "Lamp" }, ["L-1"])
    await updateProduct(catalogCtx(s.p, s.channel), {
      publicId: lamp,
      version: 0,
      patch: { robots: "noindex" },
    })
    expect(s.count("outbox WHERE status = 'pending' AND dedupe_key = ?", `product:${lamp}`)).toBe(1)
    const counters = await runOutboxOnce(s.p, catalogIndexHandlers, { now: NOW + 1 })
    expect(counters).toMatchObject({ claimed: 1, sent: 1, failed: 0 })
    expect(s.count("catalog_index WHERE product_public_id = ?", lamp)).toBe(1)
  })

  it("deleted and other-channel products never appear", async () => {
    const s = await seedCatalog(getDb())
    const lamp = await s.product("lamp", { en: "Lamp" }, ["L-1"])
    const desk = await s.product("desk", { en: "Desk" }, ["D-1"])
    await s.reindex(lamp, desk)
    expect((await listFiltered(s.read("en", s.other))).items).toEqual([])
    expect(await getProductView(s.read("en", s.other), "lamp")).toBeNull()

    await deleteProduct(catalogCtx(s.p, s.channel), { publicId: lamp, version: 0 })
    await s.reindex(lamp)
    const items = (await listFiltered(s.read())).items.map((i) => i.product)
    expect(items).toEqual([desk])
    expect(await getProductView(s.read(), "lamp")).toBeNull()
    expect((await search(s.read(), { q: "lamp" })).items).toEqual([])
    expect(s.count("catalog_fts")).toBe(1)
  })

  it("private facets never reach the match table, the row or the product view", async () => {
    const s = await seedCatalog(getDb())
    const lamp = await s.product("lamp", { en: "Lamp" }, ["L-1"])
    const brand = s.facetValue("brand", "acme")
    const supplier = s.facetValue("supplier", "secret-co", true)
    s.tag(lamp, brand)
    s.tag(lamp, supplier)
    await s.reindex(lamp)
    expect(s.count("catalog_index_facets WHERE facet_value_id = ?", brand)).toBe(1)
    expect(s.count("catalog_index_facets WHERE facet_value_id = ?", supplier)).toBe(0)
    expect(s.count("catalog_index WHERE facet_value_ids LIKE ?", `%${supplier}%`)).toBe(0)
    expect(JSON.stringify(await getProductView(s.read(), "lamp"))).not.toContain("secret")
    expect((await listFiltered(s.read(), { facets: ["supplier:secret-co"] })).items).toEqual([])
  })
})
