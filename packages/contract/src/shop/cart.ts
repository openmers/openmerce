import { oc } from "@orpc/contract"
import { z } from "zod"
import { customerEmailSchema, shopAddressInput } from "./account"

// Shop cart (05-sepet §1-2): RPC only (POST), `no-store`. The cart comes from the signed `om_c`
// cookie (guest) or the `om_s` session; amounts are never stored, every response is recalculated.

const money = z.number().int()
const version = z.number().int().min(0).optional()
const publicId = z.string().min(1).max(64)

export const shopCartView = z.object({
  cart: z
    .object({
      id: z.string(),
      version: z.number().int(),
      currency: z.string(),
      email: z.string().nullable(),
      couponCodes: z.array(z.string()),
      shippingAddress: z.record(z.string(), z.unknown()).nullable(),
      shippingMethod: z.string().nullable(),
      lines: z.array(
        z.object({
          variant: z.string(),
          lineKey: z.string(),
          quantity: z.number().int(),
          /** `false`: no price in this currency; checkout rejects the cart. */
          available: z.boolean(),
          unitPrice: money,
          amount: money,
          discount: money,
          tax: money,
          gross: money,
        }),
      ),
      shippingOptions: z.array(z.object({ id: z.string(), name: z.string(), amount: money })),
      paymentMethods: z.array(z.object({ code: z.string(), name: z.string() })),
      totals: z.object({
        subtotal: money,
        discount: money,
        shipping: money,
        tax: money,
        net: money,
        gross: money,
      }),
    })
    .nullable(),
})

export const shopCart = {
  /** `cart: null` when there is none yet (nothing is created by reading). */
  get: oc.output(shopCartView),
  addLine: oc
    .input(
      z.object({
        variant: publicId,
        quantity: z.number().int().min(1).max(9999),
        personalization: z.record(z.string(), z.unknown()).optional(),
        version,
      }),
    )
    .output(shopCartView),
  updateLine: oc
    .input(
      z.object({
        variant: publicId,
        lineKey: z.string().max(128),
        quantity: z.number().int().min(1).max(9999),
        version,
      }),
    )
    .output(shopCartView),
  removeLine: oc
    .input(z.object({ variant: publicId, lineKey: z.string().max(128), version }))
    .output(shopCartView),
  applyCoupon: oc
    .input(z.object({ code: z.string().trim().min(1).max(64), version }))
    .output(shopCartView),
  removeCoupon: oc
    .input(z.object({ code: z.string().trim().min(1).max(64), version }))
    .output(shopCartView),
  /** `null` clears the selection. */
  setShippingMethod: oc
    .input(z.object({ method: publicId.nullable(), version }))
    .output(shopCartView),
  setAddress: oc
    .input(
      z.object({
        shipping: shopAddressInput,
        billing: shopAddressInput.optional(),
        email: customerEmailSchema.optional(),
        version,
      }),
    )
    .output(shopCartView),
}
