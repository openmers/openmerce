import { oc } from "@orpc/contract"
import { z } from "zod"
import { pageSchema } from "../shared/pagination"

// Orders (07-siparis): shop sees only its own orders (another customer's is 404); a guest reads
// one order with the revocable `otk_…` token. RPC only, `no-store`; no internal ids.

const money = z.number().int()

export const orderRefSchema = z.object({ id: z.string(), number: z.string() })

export const orderSummarySchema = z.object({
  id: z.string(),
  number: z.string(),
  state: z.string(),
  paymentStatus: z.string(),
  fulfillmentStatus: z.string(),
  currency: z.string(),
  totalGross: money,
  hasPersonalization: z.boolean(),
  placedAt: z.number().int(),
})

export const orderViewSchema = orderSummarySchema.extend({
  subtotalNet: money,
  taxTotal: money,
  discountTotal: money,
  shippingTotal: money,
  stockException: z.boolean(),
  lines: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      sku: z.string().nullable(),
      quantity: z.number().int(),
      unitPriceNet: money,
      unitPriceGross: money,
      personalization: z.record(z.string(), z.unknown()).nullable(),
    }),
  ),
  payments: z.array(
    z.object({
      id: z.string(),
      amount: money,
      currency: z.string(),
      state: z.string(),
      refunded: money,
    }),
  ),
})

export const orderCursorInput = z.object({
  cursor: z.string().min(1).max(512).optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

export const shopOrders = {
  list: oc.input(orderCursorInput).output(pageSchema(orderSummarySchema)),
  get: oc
    .input(z.object({ id: z.string().min(1).max(64) }))
    .output(z.object({ order: orderViewSchema })),
  guest: oc
    .input(z.object({ token: z.string().min(5).max(200) }))
    .output(z.object({ order: orderViewSchema })),
}
