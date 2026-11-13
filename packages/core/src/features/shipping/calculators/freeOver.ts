import { z } from "zod"
import type { CalculatorDef } from "../types"

/** Free if the cart amount reaches `threshold`, otherwise `amount`. */
export const freeOver: CalculatorDef<{ threshold: number; amount: number }> = {
  code: "freeOver",
  args: z.object({ threshold: z.number().int().min(0), amount: z.number().int().min(0) }),
  calculate: (args, parcel) => ({
    ok: true,
    amount: parcel.subtotal >= args.threshold ? 0 : args.amount,
  }),
}
