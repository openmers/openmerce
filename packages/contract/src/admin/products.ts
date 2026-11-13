import { z } from "zod"
import { adminProcedure } from "../shared/adminProcedure"
import { cursorInputSchema, pageSchema } from "../shared/pagination"

// Admin katalog yüzeyi (yol haritası 15.3, 15.11): ürün + varyant yazımı ve normalize okuma.
// Okuma modeli (`catalog_index`, `product_view`) ve shop uçları bu dosyanın kapsamı dışında.

const langSchema = z.string().trim().min(2).max(10)
const codeSchema = z.string().trim().min(1).max(100)
const slugSchema = z.string().trim().min(1).max(200)
const nameSchema = z.string().trim().min(1).max(300)
const intOrNull = z.number().int().min(0).nullish()
const jsonObject = z.record(z.string(), z.unknown()).nullish()

const translationSchema = z.object({
  lang: langSchema,
  name: nameSchema,
  slug: slugSchema,
  description: z.string().max(50_000).nullish(),
  seoTitle: z.string().max(200).nullish(),
  seoDescription: z.string().max(500).nullish(),
})

const optionSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  position: z.number().int().min(0).optional(),
  values: z
    .array(
      z.object({
        code: codeSchema,
        name: nameSchema,
        position: z.number().int().min(0).optional(),
      }),
    )
    .min(1)
    .max(100),
})

const variantInputSchema = z.object({
  sku: z.string().trim().min(1).max(200),
  taxCategoryCode: codeSchema,
  barcode: z.string().trim().max(100).nullish(),
  weight: intOrNull,
  length: intOrNull,
  width: intOrNull,
  height: intOrNull,
  trackInventory: z.boolean().optional(),
  allowBackorder: z.boolean().optional(),
  backorderFloor: z.number().int().max(0).nullish(),
  minOrderQty: intOrNull,
  orderMultiple: intOrNull,
  fulfillmentType: z.enum(["physical", "digital"]).optional(),
  leadTimeDays: intOrNull,
  optionValues: z
    .array(z.object({ option: codeSchema, value: codeSchema }))
    .max(20)
    .optional(),
})

const productPatchSchema = z.object({
  robots: z.string().max(200).nullish(),
  personalization: jsonObject,
  withdrawalExemptKind: z.string().max(50).nullish(),
  customFields: jsonObject,
  metadata: jsonObject,
  privateMetadata: jsonObject,
})

const variantPatchSchema = variantInputSchema
  .omit({ optionValues: true })
  .partial()
  .extend({ taxCategoryCode: codeSchema.optional() })

const productListItemSchema = z.object({
  publicId: z.string(),
  version: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  name: z.string(),
  slug: z.string(),
})

const variantDetailSchema = z.object({
  publicId: z.string(),
  sku: z.string(),
  barcode: z.string().nullable(),
  taxCategoryCode: z.string(),
  weight: z.number().int().nullable(),
  length: z.number().int().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  trackInventory: z.boolean(),
  allowBackorder: z.boolean(),
  backorderFloor: z.number().int().nullable(),
  minOrderQty: z.number().int().nullable(),
  orderMultiple: z.number().int().nullable(),
  fulfillmentType: z.enum(["physical", "digital"]),
  leadTimeDays: z.number().int().nullable(),
  version: z.number().int(),
  optionValues: z.array(z.object({ option: z.string(), value: z.string() })),
  channels: z.array(z.string()),
})

const productDetailSchema = z.object({
  publicId: z.string(),
  version: z.number().int(),
  robots: z.string().nullable(),
  personalization: z.record(z.string(), z.unknown()).nullable(),
  withdrawalExemptKind: z.string().nullable(),
  customFields: z.record(z.string(), z.unknown()).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  privateMetadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  translations: z.array(
    z.object({
      lang: z.string(),
      name: z.string(),
      slug: z.string(),
      description: z.string().nullable(),
      seoTitle: z.string().nullable(),
      seoDescription: z.string().nullable(),
    }),
  ),
  options: z.array(
    z.object({
      code: z.string(),
      position: z.number().int(),
      name: z.string(),
      values: z.array(z.object({ code: z.string(), position: z.number().int(), name: z.string() })),
    }),
  ),
  variants: z.array(variantDetailSchema),
  channels: z.array(z.string()),
})

const writeResultSchema = z.object({
  ok: z.literal(true),
  publicId: z.string(),
  version: z.number().int(),
})

/** `admin.products.list`: imleçli, `updated_at` azalan; yalnız `public_id` dışa çıkar. */
export const adminProductsList = adminProcedure("products:read")
  .input(cursorInputSchema)
  .output(pageSchema(productListItemSchema))

/** `admin.products.get`: normalize okuma (yazma tabloları), yoksa 404. */
export const adminProductsGet = adminProcedure("products:read")
  .input(z.object({ publicId: z.string().min(1).max(64) }))
  .output(productDetailSchema)

/** `admin.products.create`: ürün + çeviri + seçenek + varyant tek `atomic()`; fiyat/stok yok. */
export const adminProductsCreate = adminProcedure("products:write")
  .input(
    z.object({
      publicId: z.string().min(1).max(64).optional(),
      translations: z.array(translationSchema).min(1).max(50),
      options: z.array(optionSchema).max(20).optional(),
      variants: z.array(variantInputSchema).min(1).max(500),
      ...productPatchSchema.shape,
    }),
  )
  .output(writeResultSchema)

/** `admin.products.update`: `version` koşullu; çakışmada 409 `CONFLICT`. */
export const adminProductsUpdate = adminProcedure("products:write")
  .input(
    z.object({
      publicId: z.string().min(1).max(64),
      version: z.number().int().min(0),
      translations: z.array(translationSchema).min(1).max(50).optional(),
      patch: productPatchSchema,
    }),
  )
  .output(writeResultSchema)

/** `admin.products.delete`: yumuşak silme; `version` koşullu. */
export const adminProductsDelete = adminProcedure("products:delete")
  .input(z.object({ publicId: z.string().min(1).max(64), version: z.number().int().min(0) }))
  .output(writeResultSchema)

export const adminVariantsCreate = adminProcedure("products:write")
  .input(z.object({ productPublicId: z.string().min(1).max(64), variant: variantInputSchema }))
  .output(writeResultSchema)

export const adminVariantsUpdate = adminProcedure("products:write")
  .input(
    z.object({
      publicId: z.string().min(1).max(64),
      productPublicId: z.string().min(1).max(64),
      version: z.number().int().min(0),
      patch: variantPatchSchema,
    }),
  )
  .output(writeResultSchema)

export const adminVariantsRemove = adminProcedure("products:delete")
  .input(
    z.object({
      publicId: z.string().min(1).max(64),
      productPublicId: z.string().min(1).max(64),
      version: z.number().int().min(0),
    }),
  )
  .output(z.object({ ok: z.literal(true), publicId: z.string() }))

export const adminProducts = {
  list: adminProductsList,
  get: adminProductsGet,
  create: adminProductsCreate,
  update: adminProductsUpdate,
  delete: adminProductsDelete,
  variants: {
    create: adminVariantsCreate,
    update: adminVariantsUpdate,
    remove: adminVariantsRemove,
  },
}
