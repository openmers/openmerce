import { type CreateProductInput, createProduct, getProduct, updateProduct } from "@openmers/core"
import {
  describeOnTargets,
  expectExactlyOneWinner,
  openTestDb,
  type TestDbFile,
} from "@openmers/test-utils"
import type Database from "better-sqlite3"
import { afterEach, describe, expect, it } from "vitest"
import { sqlitePlatform } from "../../../../packages/core/src/features/__testing__/sqlitePlatform"
import { scalar } from "../helpers"
import {
  catalogCtx,
  productWithFourVariants,
  seedChannel,
  seedTaxCategory,
  type TestPlatform,
} from "./helpers"

const count = (conn: Database.Database, table: string) =>
  scalar<number>(conn, `SELECT count(*) FROM ${table}`) ?? 0

describeOnTargets("catalog product writes", (getDb) => {
  const prepare = async () => {
    const p = sqlitePlatform(getDb())
    const channel = await seedChannel(p)
    seedTaxCategory(getDb())
    return { ctx: catalogCtx(p, channel) }
  }

  it("product + 2 options + 4 variants in one call; audit and reindex in the same atomic", async () => {
    const { ctx } = await prepare()
    const created = await createProduct(ctx, productWithFourVariants())
    expect(created).toEqual({ publicId: expect.stringMatching(/^prod_/), version: 0 })

    const conn = getDb()
    expect(count(conn, "products")).toBe(1)
    expect(count(conn, "product_translations")).toBe(2)
    expect(count(conn, "product_options")).toBe(2)
    expect(count(conn, "option_values")).toBe(4)
    expect(count(conn, "product_variants")).toBe(4)
    expect(count(conn, "variant_option_values")).toBe(8)
    expect(count(conn, "product_channels")).toBe(1)
    expect(count(conn, "variant_channels")).toBe(4)
    expect(count(conn, "audit_log")).toBe(1)
    expect(count(conn, "outbox")).toBe(1)
    expect(scalar<string>(conn, "SELECT action FROM audit_log")).toBe("products:write")
    expect(scalar<string>(conn, "SELECT payload FROM outbox")).toBe(
      JSON.stringify({ product: created.publicId }),
    )

    const detail = await getProduct(ctx, created.publicId)
    expect(detail?.translations.map((t) => t.name).sort()).toEqual(["T-shirt", "Tişört"])
    expect(detail?.options.map((o) => o.code)).toEqual(["size", "color"])
    expect(detail?.options[0]?.values.map((v) => v.name)).toEqual(["S", "M"])
    expect(detail?.variants).toHaveLength(4)
    expect(detail?.variants[0]?.optionValues).toHaveLength(2)
    expect(detail?.variants[0]?.taxCategoryCode).toBe("standard")
    expect(detail?.channels).toEqual(["chn_main"])
    expect(detail?.variants.every((v) => v.channels.length === 1)).toBe(true)
    // Only `public_id` is exposed: no internal `id` field.
    expect(JSON.stringify(detail)).not.toMatch(/"id":\d/)
  })

  it("if one statement fails, no product, option, variant, audit or outbox row remains", async () => {
    const { ctx } = await prepare()
    const first = productWithFourVariants({ skuPrefix: "A" })
    await createProduct(ctx, first)
    const before = {
      products: count(getDb(), "products"),
      options: count(getDb(), "product_options"),
      variants: count(getDb(), "product_variants"),
      audit: count(getDb(), "audit_log"),
      outbox: count(getDb(), "outbox"),
    }

    // The second product's second variant repeats the first one's SKU: the unique index fails.
    const clash: CreateProductInput = {
      translations: [{ lang: "en", name: "Clash", slug: "clash" }],
      variants: [
        { sku: "B-1", taxCategoryCode: "standard" },
        { sku: first.variants[0]?.sku ?? "A-s-red", taxCategoryCode: "standard" },
      ],
    }
    await expect(createProduct(ctx, clash)).rejects.toMatchObject({ code: "CONFLICT" })
    expect(count(getDb(), "products")).toBe(before.products)
    expect(count(getDb(), "product_options")).toBe(before.options)
    expect(count(getDb(), "product_variants")).toBe(before.variants)
    expect(count(getDb(), "audit_log")).toBe(before.audit)
    expect(count(getDb(), "outbox")).toBe(before.outbox)
  })

  it("missing and duplicate combinations are rejected before reaching the database", async () => {
    const { ctx } = await prepare()
    const base = productWithFourVariants()
    const missing = {
      ...base,
      variants: [
        { sku: "X-1", taxCategoryCode: "standard", optionValues: [{ option: "size", value: "s" }] },
      ],
    }
    await expect(createProduct(ctx, missing)).rejects.toMatchObject({ code: "INVALID_INPUT" })
    const duplicated = {
      ...base,
      variants: [
        base.variants[0] as (typeof base.variants)[number],
        { ...base.variants[0], sku: "X-2" } as (typeof base.variants)[number],
        ...base.variants.slice(1),
      ],
    }
    await expect(createProduct(ctx, duplicated)).rejects.toThrow(/kombinasyon yineleniyor/)
    expect(count(getDb(), "products")).toBe(0)
    expect(count(getDb(), "product_variants")).toBe(0)
    expect(count(getDb(), "audit_log")).toBe(0)
    expect(count(getDb(), "outbox")).toBe(0)
  })

  it("unknown tax category INVALID_INPUT; no partial write remains", async () => {
    const { ctx } = await prepare()
    const input = {
      translations: [{ lang: "en", name: "T", slug: "t" }],
      variants: [{ sku: "T-1", taxCategoryCode: "yok" }],
    }
    await expect(createProduct(ctx, input)).rejects.toMatchObject({ code: "INVALID_INPUT" })
    expect(count(getDb(), "products")).toBe(0)
    expect(count(getDb(), "product_variants")).toBe(0)
  })

  it("updateProduct bumps the version, changes the translation, writes audit/outbox", async () => {
    const { ctx } = await prepare()
    const created = await createProduct(ctx, productWithFourVariants())
    const updated = await updateProduct(ctx, {
      publicId: created.publicId,
      version: 0,
      patch: { robots: "noindex" },
      translations: [{ lang: "en", name: "Yeni ad", slug: "yeni-ad" }],
    })
    expect(updated.version).toBe(1)
    const detail = await getProduct(ctx, created.publicId)
    expect(detail).toMatchObject({ version: 1, robots: "noindex" })
    expect(detail?.translations).toHaveLength(1)
    expect(detail?.translations[0]?.name).toBe("Yeni ad")
    expect(count(getDb(), "audit_log")).toBe(2)
    expect(count(getDb(), "outbox")).toBe(1) // the pending reindex is deduplicated (dedupeKey)
  })

  it("unknown product NOT_FOUND, stale version CONFLICT", async () => {
    const { ctx } = await prepare()
    await expect(
      updateProduct(ctx, { publicId: "prod_yok", version: 0, patch: {} }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    const created = await createProduct(ctx, productWithFourVariants())
    await updateProduct(ctx, { publicId: created.publicId, version: 0, patch: {} })
    await expect(
      updateProduct(ctx, { publicId: created.publicId, version: 0, patch: {} }),
    ).rejects.toMatchObject({ code: "CONFLICT" })
  })
})

describe("[sqlite] product version race (two connections)", () => {
  let file: TestDbFile | undefined
  afterEach(() => {
    file?.close()
    file = undefined
  })

  it("exactly one winner; the loser gets CONFLICT and writes no audit/translation", async () => {
    file = openTestDb({ file: true })
    const [c1, c2] = [file.connect(), file.connect()]
    c1.pragma("busy_timeout = 5000")
    c2.pragma("busy_timeout = 5000")
    const [p1, p2] = [sqlitePlatform(c1), sqlitePlatform(c2)]
    const channel = await seedChannel(p1)
    seedTaxCategory(c1)
    const created = await createProduct(catalogCtx(p1, channel), productWithFourVariants())

    const attempt = (p: TestPlatform, name: string) =>
      updateProduct(catalogCtx(p, channel), {
        publicId: created.publicId,
        version: 0,
        patch: { robots: name },
        translations: [{ lang: "en", name, slug: `slug-${name}` }],
      })
    const winner = expectExactlyOneWinner(
      await Promise.allSettled([attempt(p1, "bir"), attempt(p2, "iki")]),
      "CONFLICT",
    )
    expect(winner.version).toBe(1)
    const final = await getProduct(catalogCtx(p2, channel), created.publicId)
    expect(final?.version).toBe(1)
    expect(final?.robots).toBe(final?.translations[0]?.name)
    expect(
      scalar<number>(c2, "SELECT count(*) FROM audit_log WHERE action = 'products:write'"),
    ).toBe(
      2, // 1 create + 1 winning update
    )
    expect(scalar<number>(c2, "SELECT count(*) FROM outbox")).toBe(1)
    expect(final?.translations).toHaveLength(1)
  })
})
