import { z } from "zod"
import { type ActionDef, percentOf } from "../../types"

/** Kargo ücretinin kalanından `bp` baz puan indirim (10000 = ücretsiz kargo). */
export const shippingPercent: ActionDef<{ bp: number }> = {
  code: "shippingPercent",
  args: z.object({ bp: z.number().int().min(1).max(10_000) }),
  run: (args, state) => [
    { target: "shipping", amount: Math.min(state.shipping, percentOf(state.shipping, args.bp)) },
  ],
}
