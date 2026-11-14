import { oc } from "@orpc/contract"
import { z } from "zod"

// Customer uploads (12-medya): personalization images of the caller's cart. RPC only, `no-store`.
// The file goes straight to storage with the signed URL; confirm checks the real bytes.

const id = z.string().min(1).max(64)

export const uploadTicketSchema = z.object({
  id: z.string(),
  /** Send the file with `PUT` to this URL, with `headers`, before `expiresAt`. */
  uploadUrl: z.string(),
  headers: z.record(z.string(), z.string()),
  expiresAt: z.number().int(),
})

export const uploadResultSchema = z.object({
  id: z.string(),
  status: z.enum(["ready", "rejected"]),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  /** Why it was rejected; `null` when ready. */
  reason: z.enum(["too_large", "type", "dimensions"]).nullable(),
})

export const uploadCreateInput = z.object({
  mime: z.string().min(1).max(100),
  bytes: z.number().int().min(1),
})

export const shopUploads = {
  create: oc.input(uploadCreateInput).output(uploadTicketSchema),
  /** File not uploaded yet → 409 `CONFLICT`; retry after the `PUT`. */
  confirm: oc.input(z.object({ id })).output(uploadResultSchema),
}
