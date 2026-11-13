import { z } from "zod"
import type { PaymentHandler } from "../port/paymentHandler"
import { PaymentError } from "../types"

/** Per-channel account details live in the method's args (one method record per channel). */
export const bankTransferArgs = z.object({
  accountName: z.string().min(1).max(140),
  iban: z.string().regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/),
  bankName: z.string().max(140).optional(),
  /** Unpaid reservations expire after this; the checkout sweeper releases them. */
  expiresInHours: z.number().int().min(1).max(720).default(72),
})

export function parseArgs<S extends z.ZodType>(schema: S, args: unknown): z.infer<S> {
  const parsed = schema.safeParse(args)
  if (!parsed.success) throw new PaymentError("INVALID_INPUT", "invalid payment method arguments")
  return parsed.data
}

/**
 * Manual bank transfer (06 §9): no provider, no webhook. The order is settled by admin approval
 * (or a bank integration); the local `expires_at` is authoritative for releasing stock.
 */
export const bankTransfer: PaymentHandler = {
  code: "bankTransfer",
  kind: "manual",
  async createCheckout(ctx, target, args) {
    const a = parseArgs(bankTransferArgs, args)
    return {
      pending: true,
      instructions: {
        accountName: a.accountName,
        iban: a.iban,
        bankName: a.bankName ?? null,
        // the customer writes this on the transfer so the admin can match it
        reference: target.publicId,
        amount: target.amount,
        currency: target.currency,
        expiresAt: ctx.now + a.expiresInHours * 3_600_000,
      },
    }
  },
  // nothing signs a bank transfer: every webhook is rejected
  async verifyWebhook() {
    return null
  },
}
