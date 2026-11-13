import { oc } from "@orpc/contract"
import { z } from "zod"
import { customerEmailSchema } from "./account"
import { orderRefSchema } from "./orders"

// Checkout (05-sepet §3, §5-6): `reserve` needs an `Idempotency-Key` header (same key + same body
// returns the same reservation); `return` is the payment return page (provider truth → settle).

const name = z.string().trim().max(100).optional()

export const shopCheckout = {
  reserve: oc
    .input(
      z.object({
        paymentMethod: z.string().min(1).max(64),
        /** Required without a session: the guest customer record is found or created by it. */
        email: customerEmailSchema.optional(),
        firstName: name,
        lastName: name,
        /** Consent checkbox codes (e.g. personalized-goods return notice). */
        consents: z.array(z.string().min(1).max(64)).max(20).optional(),
        version: z.number().int().min(0).optional(),
      }),
    )
    .output(
      z.object({
        reservation: z.string(),
        expiresAt: z.number().int(),
        next: z.discriminatedUnion("kind", [
          z.object({ kind: z.literal("redirect"), url: z.string() }),
          z.object({ kind: z.literal("pending"), instructions: z.record(z.string(), z.unknown()) }),
          /** Placed on confirmation (cash on delivery). */
          z.object({ kind: z.literal("placed") }),
        ]),
        order: orderRefSchema.nullable(),
        /** Guest order link token (`otk_…`), only without a session. */
        guestToken: z.string().nullable(),
      }),
    ),
  return: oc
    .input(
      z.object({
        reservation: z.string().min(1).max(64),
        /** Provider reference from the return URL; defaults to the reservation id. */
        reference: z.string().min(1).max(200).optional(),
      }),
    )
    .output(
      z.object({
        status: z.enum(["placed", "pending", "failed"]),
        order: orderRefSchema.nullable(),
        guestToken: z.string().nullable(),
      }),
    ),
}
