import { z } from "zod"
import { adminProcedure } from "../shared/adminProcedure"
import { bulkInput, bulkResults } from "../shared/bulk"

// Admin fiyat yüzeyi (yol haritası 16): liste CRUD + varyant fiyatı okuma/yazma.
// Para tamsayı küçük birimdir; para birimi listeden gelir, kayıtta istemciden alınmaz.

const publicIdSchema = z.string().min(1).max(64)
const money = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)
const timestamp = z.number().int().min(0).nullish()
const listType = z.enum(["base", "sale", "contract"])

const priceListSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  currency: z.string(),
  type: listType,
  priority: z.number().int(),
  startsAt: z.number().int().nullable(),
  endsAt: z.number().int().nullable(),
  includesTax: z.boolean(),
  status: z.enum(["active", "expired"]),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  priority: z.number().int().optional(),
  startsAt: timestamp,
  endsAt: timestamp,
  includesTax: z.boolean().optional(),
})

const okResult = z.object({ ok: z.literal(true), publicId: z.string() })

/** `admin.priceLists.list`: `ctx.channel`'ın listeleri. */
export const adminPriceListsList = adminProcedure("prices:read")
  .input(z.object({}))
  .output(z.array(priceListSchema))

export const adminPriceListsCreate = adminProcedure("prices:write")
  .input(
    z.object({
      name: z.string().trim().min(1).max(200),
      currency: z.string().regex(/^[A-Z]{3}$/),
      type: listType,
      priority: z.number().int().optional(),
      startsAt: timestamp,
      endsAt: timestamp,
      includesTax: z.boolean(),
    }),
  )
  .output(okResult)

/** `currency` ve `type` değişmez. */
export const adminPriceListsUpdate = adminProcedure("prices:write")
  .input(z.object({ publicId: publicIdSchema, patch: patchSchema }))
  .output(okResult)

/** `base` liste silinemez (409). */
export const adminPriceListsDelete = adminProcedure("prices:write")
  .input(z.object({ publicId: publicIdSchema }))
  .output(okResult)

const priceRowSchema = z.object({
  priceList: z.string(),
  type: listType,
  priority: z.number().int(),
  startsAt: z.number().int().nullable(),
  endsAt: z.number().int().nullable(),
  status: z.enum(["active", "expired"]),
  variant: z.string(),
  minQty: z.number().int(),
  amount: z.number().int(),
  compareAtAmount: z.number().int().nullable(),
  currency: z.string(),
})

/** `admin.prices.get`: varyant(lar)ın fiyat satırları; liste verilmezse kanalın bütün listeleri. */
export const adminPricesGet = adminProcedure("prices:read")
  .input(
    z.object({
      variantPublicIds: z.array(publicIdSchema).min(1).max(100),
      priceListPublicIds: z.array(publicIdSchema).min(1).max(50).optional(),
    }),
  )
  .output(z.array(priceRowSchema))

/** `admin.prices.set` (`prices.setMany`): upsert, kayıt başına sonuç, idempotent. */
export const adminPricesSet = adminProcedure("prices:write")
  .input(
    z.object({
      priceListPublicId: publicIdSchema,
      ...bulkInput(
        z.object({
          variantPublicId: publicIdSchema,
          minQty: z.number().int().min(1).optional(),
          amount: money,
          compareAtAmount: money.nullish(),
        }),
      ).shape,
    }),
  )
  .output(bulkResults(z.object({ variantPublicId: z.string(), minQty: z.number().int() })))

export const adminPriceLists = {
  list: adminPriceListsList,
  create: adminPriceListsCreate,
  update: adminPriceListsUpdate,
  delete: adminPriceListsDelete,
}

export const adminPrices = { get: adminPricesGet, set: adminPricesSet }
