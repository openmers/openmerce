import { z } from "zod"
import type { ConditionDef } from "../../types"

/** The total of promotion-eligible lines is at least `amount` (minor units). */
export const minAmount: ConditionDef<{ amount: number }> = {
  code: "minAmount",
  args: z.object({ amount: z.number().int().min(0) }),
  check: (args, view) => view.subtotal >= args.amount,
}
