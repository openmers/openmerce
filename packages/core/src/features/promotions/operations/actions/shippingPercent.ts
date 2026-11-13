import { z } from "zod"
import { type ActionDef, percentOf } from "../../types"

/** A `bp` basis point discount off the remaining shipping fee (10000 = free shipping). */
export const shippingPercent: ActionDef<{ bp: number }> = {
  code: "shippingPercent",
  args: z.object({ bp: z.number().int().min(1).max(10_000) }),
  run: (args, state) => [
    { target: "shipping", amount: Math.min(state.shipping, percentOf(state.shipping, args.bp)) },
  ],
}
