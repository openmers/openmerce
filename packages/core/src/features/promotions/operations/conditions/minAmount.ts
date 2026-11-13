import { z } from "zod"
import type { ConditionDef } from "../../types"

/** Promosyona açık satırların toplamı en az `amount` (küçük birim). */
export const minAmount: ConditionDef<{ amount: number }> = {
  code: "minAmount",
  args: z.object({ amount: z.number().int().min(0) }),
  check: (args, view) => view.subtotal >= args.amount,
}
