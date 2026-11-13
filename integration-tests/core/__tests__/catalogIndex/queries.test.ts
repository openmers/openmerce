import {
  facetCounts,
  facetCountsQuery,
  fullReindexChunk,
  getProductViewQuery,
  listCollection,
  listFiltered,
  listFilteredQuery,
  search,
  searchQuery,
} from "@openmers/core"
import { assertNoFullScan, describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { NOW } from "../catalog/helpers"
import { seedCatalog } from "./helpers"

describeOnTargets("catalog read model: storefront queries", (getDb) => {
  /** Five products: two brands, one color, one collection, priced; indexed by the chunked full reindex. */
  const prepare = async () => {
    const s = await seedCatalog(getDb())
    const names = ["Işık Lamba", "Masa", "Sandalye", "Ayna", "Halı"]
    const ids: string[] = []
    for (const [i, tr] of names.entries()) {
      ids.push(
        await s.product(
          `p${i}`,
          { en: `Item ${String.fromCharCode(69 - i)}`, tr },
          [`SKU-${i}A`, `SKU-${i}B`],
          {
            now: NOW + i,
          },
        ),
      )
    }
    const acme = s.facetValue("brand", "acme")
    const zeta = s.facetValue("brand", "zeta")
    const red = s.facetValue("color", "red")
    ids.forEach((id, i) => {
      s.tag(id, i % 2 === 0 ? acme : zeta)
      if (i < 2) s.tag(id, red)
    })
    const variants = ids.map((id) => s.variantIds(id))
    variants.forEach(([a, b], i) => {
      s.price(a as number, 1000 - i * 100)
      s.price(b as number, 2000)
    })
    s.collection("col_sale", [variants[0]?.[0], variants[2]?.[1], variants[4]?.[0]] as number[])

    let cursor: number | undefined
    let chunks = 0
    do {
      const result = await fullReindexChunk(s.p, { cursor, limit: 2 })
      cursor = result.nextCursor ?? undefined
      chunks += 1
    } while (cursor !== undefined)
    expect(chunks).toBe(3)
    return { s, ids, acme, zeta, red }
  }

  it("the full reindex is chunked and resumable: every product indexed once per language", async () => {
    const { s } = await prepare()
    expect(s.count("catalog_index WHERE group_first = 1")).toBe(10)
    expect(s.count("catalog_index")).toBe(20)
    expect(s.count("product_view")).toBe(10)
  })

  it("collection page: products of the collection, one card each, priced range", async () => {
    const { s, ids } = await prepare()
    const page = await listCollection(s.read(), { collection: "col_sale" })
    expect(page.items.map((i) => i.product)).toEqual([ids[0], ids[2], ids[4]])
    expect(page.items[0]).toMatchObject({ priceMin: 1000, priceMax: 2000, currency: "USD" })
    expect((await listCollection(s.read(), { collection: "col_none" })).items).toEqual([])
  })

  it("filtered list: AND over facets, named sorts, stable cursor pagination", async () => {
    const { s, ids } = await prepare()
    const acmeRed = await listFiltered(s.read(), { facets: ["brand:acme", "color:red"] })
    expect(acmeRed.items.map((i) => i.product)).toEqual([ids[0]])

    const walk = async (sort: "name" | "newest" | "price") => {
      const seen: string[] = []
      let cursor: string | undefined
      do {
        const page = await listFiltered(s.read(), { sort, cursor, limit: 2 })
        seen.push(...page.items.map((i) => i.product))
        cursor = page.nextCursor ?? undefined
      } while (cursor)
      return seen
    }
    const byName = [...ids].reverse()
    expect(await walk("name")).toEqual(byName)
    expect(await walk("newest")).toEqual(byName)
    expect(await walk("price")).toEqual(byName)
    await expect(listFiltered(s.read(), { cursor: "garbage" })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    })
  })

  it("facet counts group by value under the current filters", async () => {
    const { s } = await prepare()
    const all = await facetCounts(s.read())
    expect(all).toEqual([
      { facet: "brand", value: "acme", count: 3 },
      { facet: "brand", value: "zeta", count: 2 },
      { facet: "color", value: "red", count: 2 },
    ])
    const red = await facetCounts(s.read(), { facets: ["color:red"] })
    expect(red.find((c) => c.value === "zeta")?.count).toBe(1)
  })

  it("search finds folded and prefix terms in the request language", async () => {
    const { s, ids } = await prepare()
    const tr = s.read("tr")
    expect((await search(tr, { q: "isik" })).items.map((i) => i.product)).toEqual([ids[0]])
    expect((await search(tr, { q: "IŞIK lam" })).items.map((i) => i.product)).toEqual([ids[0]])
    expect((await search(tr, { q: "hali" })).items.map((i) => i.product)).toEqual([ids[4]])
    expect((await search(s.read(), { q: "sku-3b" })).items.map((i) => i.product)).toEqual([ids[3]])
    expect((await search(s.read(), { q: "isik" })).items).toEqual([])
    const first = await search(s.read(), { q: "item", limit: 3 })
    const second = await search(s.read(), { q: "item", limit: 3, cursor: first.nextCursor ?? "" })
    expect(new Set([...first.items, ...second.items].map((i) => i.product)).size).toBe(5)
  })

  it("no storefront query does a full table scan", async () => {
    const { s, acme, red } = await prepare()
    const db = getDb()
    const base = { channelId: s.channel.id, lang: "en", limit: 24 }
    const facet = (id: number, count: number) => ({ kind: "facet" as const, id, count })
    const collection = { kind: "collection" as const, id: 1, count: 3 }
    for (const sort of ["default", "name", "newest", "price"] as const) {
      for (const filters of [[], [collection], [facet(acme, 3), facet(red, 2)]]) {
        assertNoFullScan(db, listFilteredQuery({ ...base, sort, filters }))
        assertNoFullScan(
          db,
          listFilteredQuery({
            ...base,
            sort,
            filters,
            cursor: [sort, sort === "name" ? "a" : 5, 3],
          }),
        )
      }
    }
    assertNoFullScan(db, facetCountsQuery({ ...base, filters: [] }))
    assertNoFullScan(db, facetCountsQuery({ ...base, filters: [collection, facet(red, 2)] }))
    assertNoFullScan(db, searchQuery({ ...base, match: '"lam"*', offset: 0 }))
    assertNoFullScan(db, getProductViewQuery({ channelId: s.channel.id, lang: "en", slug: "p0" }))
  })
})
