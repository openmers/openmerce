import {
  channels,
  optionValues,
  optionValueTranslations,
  productChannels,
  productOptions,
  productOptionTranslations,
  products,
  productTranslations,
  productVariants,
  taxCategories,
  variantChannels,
  variantOptionValues,
} from "@openmers/db"
import { and, eq, inArray, isNull } from "drizzle-orm"
import type { CatalogCtx } from "../types"

export type ProductTranslationDetail = {
  lang: string
  name: string
  slug: string
  description: string | null
  seoTitle: string | null
  seoDescription: string | null
}

export type ProductOptionDetail = {
  code: string
  position: number
  name: string
  values: Array<{ code: string; position: number; name: string }>
}

export type ProductVariantDetail = {
  publicId: string
  sku: string
  barcode: string | null
  taxCategoryCode: string
  weight: number | null
  length: number | null
  width: number | null
  height: number | null
  trackInventory: boolean
  allowBackorder: boolean
  backorderFloor: number | null
  minOrderQty: number | null
  orderMultiple: number | null
  fulfillmentType: "physical" | "digital"
  leadTimeDays: number | null
  version: number
  optionValues: Array<{ option: string; value: string }>
  channels: string[]
}

export type ProductDetail = {
  publicId: string
  version: number
  robots: string | null
  personalization: Record<string, unknown> | null
  withdrawalExemptKind: string | null
  customFields: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  privateMetadata: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
  translations: ProductTranslationDetail[]
  options: ProductOptionDetail[]
  variants: ProductVariantDetail[]
  channels: string[]
}

/** Name in the requested language; otherwise the first translation, otherwise the code (admin normalized read). */
function pickName(rows: ReadonlyArray<{ lang: string; name: string }>, lang: string, code: string) {
  return rows.find((row) => row.lang === lang)?.name ?? rows[0]?.name ?? code
}

/** Normalized read for admin: product + translations + options + variants from the write tables. */
export async function getProduct(
  ctx: Pick<CatalogCtx, "platform" | "lang">,
  publicId: string,
): Promise<ProductDetail | null> {
  const db = ctx.platform.db
  const row = (
    await db
      .select()
      .from(products)
      .where(and(eq(products.publicId, publicId), isNull(products.deletedAt)))
      .limit(1)
  )[0]
  if (!row) return null

  const translations = await db
    .select()
    .from(productTranslations)
    .where(eq(productTranslations.productId, row.id))
    .orderBy(productTranslations.lang)
  const options = await db
    .select()
    .from(productOptions)
    .where(eq(productOptions.productId, row.id))
    .orderBy(productOptions.position)
  const optionIds = options.map((option) => option.id)
  const values = optionIds.length
    ? await db
        .select()
        .from(optionValues)
        .where(inArray(optionValues.optionId, optionIds))
        .orderBy(optionValues.position)
    : []
  const valueIds = values.map((value) => value.id)
  const optionNames = optionIds.length
    ? await db
        .select()
        .from(productOptionTranslations)
        .where(inArray(productOptionTranslations.optionId, optionIds))
    : []
  const valueNames = valueIds.length
    ? await db
        .select()
        .from(optionValueTranslations)
        .where(inArray(optionValueTranslations.optionValueId, valueIds))
    : []
  const variants = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.productId, row.id), isNull(productVariants.deletedAt)))
    .orderBy(productVariants.id)
  const variantIds = variants.map((variant) => variant.id)

  const combos = variantIds.length
    ? await db
        .select({
          variantId: variantOptionValues.variantId,
          option: productOptions.code,
          value: optionValues.code,
        })
        .from(variantOptionValues)
        .innerJoin(productOptions, eq(productOptions.id, variantOptionValues.optionId))
        .innerJoin(optionValues, eq(optionValues.id, variantOptionValues.optionValueId))
        .where(inArray(variantOptionValues.variantId, variantIds))
    : []
  const productChannelRows = await db
    .select({ publicId: channels.publicId })
    .from(productChannels)
    .innerJoin(channels, eq(channels.id, productChannels.channelId))
    .where(eq(productChannels.productId, row.id))
    .orderBy(channels.id)
  const variantChannelRows = variantIds.length
    ? await db
        .select({ variantId: variantChannels.variantId, publicId: channels.publicId })
        .from(variantChannels)
        .innerJoin(channels, eq(channels.id, variantChannels.channelId))
        .where(inArray(variantChannels.variantId, variantIds))
        .orderBy(channels.id)
    : []
  const taxIds = [...new Set(variants.map((variant) => variant.taxCategoryId))]
  const taxRows = taxIds.length
    ? await db
        .select({ id: taxCategories.id, code: taxCategories.code })
        .from(taxCategories)
        .where(inArray(taxCategories.id, taxIds))
    : []
  const taxCode = new Map(taxRows.map((tax) => [tax.id, tax.code]))

  return {
    publicId: row.publicId,
    version: row.version,
    robots: row.robots,
    personalization: row.personalization ?? null,
    withdrawalExemptKind: row.withdrawalExemptKind,
    customFields: row.customFields ?? null,
    metadata: row.metadata ?? null,
    privateMetadata: row.privateMetadata ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    translations: translations.map((t) => ({
      lang: t.lang,
      name: t.name,
      slug: t.slug,
      description: t.description,
      seoTitle: t.seoTitle,
      seoDescription: t.seoDescription,
    })),
    options: options.map((option) => ({
      code: option.code,
      position: option.position,
      name: pickName(
        optionNames.filter((t) => t.optionId === option.id),
        ctx.lang,
        option.code,
      ),
      values: values
        .filter((value) => value.optionId === option.id)
        .map((value) => ({
          code: value.code,
          position: value.position,
          name: pickName(
            valueNames.filter((t) => t.optionValueId === value.id),
            ctx.lang,
            value.code,
          ),
        })),
    })),
    variants: variants.map((variant) => ({
      publicId: variant.publicId,
      sku: variant.sku,
      barcode: variant.barcode,
      taxCategoryCode: taxCode.get(variant.taxCategoryId) ?? "",
      weight: variant.weight,
      length: variant.length,
      width: variant.width,
      height: variant.height,
      trackInventory: variant.trackInventory,
      allowBackorder: variant.allowBackorder,
      backorderFloor: variant.backorderFloor,
      minOrderQty: variant.minOrderQty,
      orderMultiple: variant.orderMultiple,
      fulfillmentType: variant.fulfillmentType,
      leadTimeDays: variant.leadTimeDays,
      version: variant.version,
      optionValues: combos
        .filter((combo) => combo.variantId === variant.id)
        .map((combo) => ({ option: combo.option, value: combo.value })),
      channels: variantChannelRows
        .filter((channel) => channel.variantId === variant.id)
        .map((channel) => channel.publicId),
    })),
    channels: productChannelRows.map((channel) => channel.publicId),
  }
}
