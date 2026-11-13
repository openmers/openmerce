import { z } from "zod"
import type { PaymentHandler } from "../port/paymentHandler"
import { parseArgs } from "./bankTransfer"

export const cashOnDeliveryArgs = z.object({
  /** Optional service fee in minor units, shown to the customer. */
  fee: z.number().int().min(0).default(0),
})

/**
 * Cash on delivery (06 §9): the order is settled on order confirmation without a payment row
 * (payment status `awaiting`); collection is marked at delivery.
 */
export const cashOnDelivery: PaymentHandler = {
  code: "cashOnDelivery",
  kind: "manual",
  async createCheckout(_ctx, target, args) {
    const a = parseArgs(cashOnDeliveryArgs, args)
    return { pending: true, instructions: { fee: a.fee, currency: target.currency } }
  },
  // nothing signs a cash payment: every webhook is rejected
  async verifyWebhook() {
    return null
  },
}
