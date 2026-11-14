import { z } from "zod"
import { adminProcedure } from "../shared/adminProcedure"
import { cursorInputSchema, pageSchema } from "../shared/pagination"
import { shopImage } from "../shop/catalog"
import { uploadCreateInput, uploadResultSchema, uploadTicketSchema } from "../shop/uploads"

// Admin media library (12-medya): upload with a signed URL, confirm, list, delete. Delete is
// refused while a product, digital asset, fulfillment or poster still uses the item.

const id = z.string().min(1).max(64)

export const adminMediaCreate = adminProcedure("media:write")
  .input(uploadCreateInput.extend({ bucket: z.enum(["public", "private"]).default("public") }))
  .output(uploadTicketSchema)

export const adminMediaConfirm = adminProcedure("media:write")
  .input(z.object({ id }))
  .output(uploadResultSchema)

export const adminMediaItem = z.object({
  id: z.string(),
  bucket: z.enum(["public", "private"]),
  mime: z.string().nullable(),
  bytes: z.number().int().nullable(),
  /** Public items only; private ones need a signed link. */
  image: shopImage.nullable(),
  createdAt: z.number().int(),
})

export const adminMediaList = adminProcedure("media:read")
  .input(cursorInputSchema)
  .output(pageSchema(adminMediaItem))

export const adminMediaDelete = adminProcedure("media:write")
  .input(z.object({ id }))
  .output(z.object({ ok: z.literal(true) }))

export const adminMedia = {
  create: adminMediaCreate,
  confirm: adminMediaConfirm,
  list: adminMediaList,
  delete: adminMediaDelete,
}
