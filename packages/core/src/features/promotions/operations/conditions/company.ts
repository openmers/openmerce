import { z } from "zod"
import type { ConditionDef } from "../../types"

/** The cart belongs to one of the given companies (B2B). */
export const company: ConditionDef<{ companyIds: number[] }> = {
  code: "company",
  args: z.object({ companyIds: z.array(z.number().int().positive()).min(1) }),
  check: (args, view) =>
    view.cart.companyId !== null && args.companyIds.includes(view.cart.companyId),
}
