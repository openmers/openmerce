import { z } from "zod"
import { adminProcedure } from "../shared/adminProcedure"

// Admin stock surface (roadmap 17): warehouse list/create, reading/adjusting variant stock.
// Reservation lives in checkout's `atomic()`; there is no endpoint here.

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

/** Creates a warehouse; if `channelPriority` is given, also links it to `ctx.channel`. */
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

/** Manual adjustment: signed delta; 400 if the result is negative. */
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
