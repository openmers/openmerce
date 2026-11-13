import { z } from "zod"
import { adminProcedure } from "../shared/adminProcedure"

// Admin stok yüzeyi (yol haritası 17): depo listesi/oluşturma, varyant stoku okuma/düzeltme.
// Rezervasyon checkout'un `atomic()`'indedir; burada uç yok.

const publicIdSchema = z.string().min(1).max(64)
const text = z.string().trim().max(200).nullish()

const locationSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  city: z.string().nullable(),
  countryCode: z.string().nullable(),
  active: z.boolean(),
  pickupEnabled: z.boolean(),
  channelPriority: z.number().int().nullable(),
})

export const adminStockLocationsList = adminProcedure("stock:read")
  .input(z.object({}))
  .output(z.array(locationSchema))

/** Depo oluşturur; `channelPriority` verilirse `ctx.channel`'a da bağlar. */
export const adminStockLocationsCreate = adminProcedure("stock:write")
  .input(
    z.object({
      name: z.string().trim().min(1).max(200),
      addressLine1: text,
      addressLine2: text,
      city: text,
      region: text,
      district: text,
      postalCode: z.string().trim().max(20).nullish(),
      countryCode: z
        .string()
        .regex(/^[A-Z]{2}$/)
        .nullish(),
      active: z.boolean().optional(),
      pickupEnabled: z.boolean().optional(),
      channelPriority: z.number().int().min(0).optional(),
    }),
  )
  .output(z.object({ ok: z.literal(true), publicId: z.string() }))

export const adminStockLevelsGet = adminProcedure("stock:read")
  .input(z.object({ variantPublicId: publicIdSchema }))
  .output(
    z.array(
      z.object({
        location: z.string(),
        onHand: z.number().int(),
        reserved: z.number().int(),
        safety: z.number().int(),
        available: z.number().int(),
        version: z.number().int(),
      }),
    ),
  )

/** Elle düzeltme: işaretli fark; sonuç negatifse 400. */
export const adminStockLevelsAdjust = adminProcedure("stock:write")
  .input(
    z.object({
      variantPublicId: publicIdSchema,
      locationPublicId: publicIdSchema,
      delta: z
        .number()
        .int()
        .refine((n) => n !== 0, "fark sıfır olamaz"),
    }),
  )
  .output(z.object({ ok: z.literal(true) }))

export const adminStock = {
  locations: { list: adminStockLocationsList, create: adminStockLocationsCreate },
  levels: { get: adminStockLevelsGet, adjust: adminStockLevelsAdjust },
}
