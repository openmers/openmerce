import { z } from "zod"
import type { CalculatorDef } from "../types"

/** Sabit ücret. */
export const flat: CalculatorDef<{ amount: number }> = {
  code: "flat",
  args: z.object({ amount: z.number().int().min(0) }),
  calculate: (args) => ({ ok: true, amount: args.amount }),
}
