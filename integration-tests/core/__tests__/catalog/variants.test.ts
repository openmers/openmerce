import {
  addVariant,
  type CreateProductInput,
  createProduct,
  getProduct,
  removeVariant,
  updateVariant,
} from "@openmers/core"
import { describeOnTargets } from "@openmers/test-utils"
import type Database from "better-sqlite3"
import { expect, it } from "vitest"
import { sqlitePlatform } from "../../../../packages/core/src/features/__testing__/sqlitePlatform"
import { scalar } from "../helpers"
import { catalogCtx, productWithFourVariants, seedChannel, seedTaxCategory } from "./helpers"

const count = (conn: Database.Database, table: string) =>
  scalar<number>(conn, `SELECT count(*) FROM ${table}`) ?? 0

const twoVariantProduct = (): CreateProductInput => ({
  translations: [{ lang: "en", name: "Kalem", slug: "kalem" }],
  variants: [
    { sku: "K-1", taxCategoryCode: "standard" },
    { sku: "K-2", taxCategoryCode: "standard" },
  ],
})

describeOnTargets("catalog variant writes", (getDb) => {
  const prepare = async () => {
    const p = sqlitePlatform(getDb())
    const channel = await seedChannel(p)
    seedTaxCategory(getDb())
    return { p, channel, ctx: catalogCtx(p, channel) }
  }

  it("addVariant writes the variant, channel assignment, audit and reindex job", async () => {
    const { ctx } = await prepare()
    const product = await createProduct(ctx, twoVariantProduct())
    const added = await addVariant(ctx, {
      productPublicId: product.publicId,
      variant: { sku: "K-3", taxCategoryCode: "standard" },
    })
    expect(added).toEqual({ publicId: expect.stringMatching(/^var_/), version: 0 })
    const detail = await getProduct(ctx, product.publicId)
    expect(detail?.variants.map((v) => v.sku)).toEqual(["K-1", "K-2", "K-3"])
    expect(detail?.variants[2]?.channels).toEqual(["chn_main"])
    expect(
      scalar<number>(
        getDb(),
        "SELECT count(*) FROM audit_log WHERE entity_public_id = ?",
        added.publicId,
      ),
    ).toBe(1)
    expect(count(getDb(), "outbox")).toBe(1) // the pending reindex is deduplicated
  })

  it("cannot add a variant to a missing product: NOT_FOUND, no rows written", async () => {
    const { ctx } = await prepare()
    await expect(
      addVariant(ctx, {
        productPublicId: "prod_yok",
        variant: { sku: "K-9", taxCategoryCode: "standard" },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(count(getDb(), "product_variants")).toBe(0)
    expect(count(getDb(), "audit_log")).toBe(0)
    expect(count(getDb(), "outbox")).toBe(0)
  })

  it("an option value is added to the variant; unknown option INVALID_INPUT", async () => {
    const { ctx } = await prepare()
    const product = await createProduct(ctx, productWithFourVariants())
    const added = await addVariant(ctx, {
      productPublicId: product.publicId,
      variant: {
        sku: "TS-xl-red",
        taxCategoryCode: "standard",
        optionValues: [{ option: "size", value: "m" }],
      },
    })
    const detail = await getProduct(ctx, product.publicId)
    expect(detail?.variants.find((v) => v.publicId === added.publicId)?.optionValues).toEqual([
      { option: "size", value: "m" },
    ])
    await expect(
      addVariant(ctx, {
        productPublicId: product.publicId,
        variant: {
          sku: "TS-xl-blue",
          taxCategoryCode: "standard",
          optionValues: [{ option: "marka", value: "x" }],
        },
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" })
  })

  it("updateVariant bumps the version, SKU changes; stale version CONFLICT and no audit", async () => {
    const { ctx } = await prepare()
    const product = await createProduct(ctx, twoVariantProduct())
    const variant = (await getProduct(ctx, product.publicId))?.variants[0]
    if (!variant) throw new Error("varyant yok")
    const auditBefore = count(getDb(), "audit_log")

    const updated = await updateVariant(ctx, {
      publicId: variant.publicId,
      productPublicId: product.publicId,
      version: 0,
      patch: { sku: "K-1-YENI", weight: 120 },
    })
    expect(updated.version).toBe(1)
    const detail = await getProduct(ctx, product.publicId)
    expect(detail?.variants[0]).toMatchObject({ sku: "K-1-YENI", weight: 120, version: 1 })

    await expect(
      updateVariant(ctx, {
        publicId: variant.publicId,
        productPublicId: product.publicId,
        version: 0,
        patch: { sku: "K-1-ESKI" },
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" })
    expect(count(getDb(), "audit_log")).toBe(auditBefore + 1)
    expect((await getProduct(ctx, product.publicId))?.variants[0]?.sku).toBe("K-1-YENI")
  })

  it("the last variant cannot be deleted; after deleting the first, its SKU can be reused", async () => {
    const { ctx } = await prepare()
    const product = await createProduct(ctx, twoVariantProduct())
    const variants = (await getProduct(ctx, product.publicId))?.variants ?? []
    const [first, second] = variants
    if (!first || !second) throw new Error("iki varyant bekleniyordu")

    await expect(
      removeVariant(ctx, {
        publicId: first.publicId,
        productPublicId: product.publicId,
        version: 0,
      }),
    ).resolves.toEqual({ publicId: first.publicId })
    expect((await getProduct(ctx, product.publicId))?.variants).toHaveLength(1)

    await expect(
      removeVariant(ctx, {
        publicId: second.publicId,
        productPublicId: product.publicId,
        version: 0,
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" })
    expect((await getProduct(ctx, product.publicId))?.variants).toHaveLength(1)

    // A deleted variant's SKU can be reused thanks to the partial unique index.
    await addVariant(ctx, {
      productPublicId: product.publicId,
      variant: { sku: first.sku, taxCategoryCode: "standard" },
    })
    expect((await getProduct(ctx, product.publicId))?.variants).toHaveLength(2)
  })

  it("delete with a stale version CONFLICT, unknown variant NOT_FOUND", async () => {
    const { ctx } = await prepare()
    const product = await createProduct(ctx, twoVariantProduct())
    const first = (await getProduct(ctx, product.publicId))?.variants[0]
    if (!first) throw new Error("varyant yok")
    await removeVariant(ctx, {
      publicId: first.publicId,
      productPublicId: product.publicId,
      version: 0,
    })
    await expect(
      removeVariant(ctx, {
        publicId: first.publicId,
        productPublicId: product.publicId,
        version: 0,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    const second = (await getProduct(ctx, product.publicId))?.variants[0]
    if (!second) throw new Error("ikinci varyant yok")
    await expect(
      removeVariant(ctx, {
        publicId: second.publicId,
        productPublicId: product.publicId,
        version: 99,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" })
  })
})
