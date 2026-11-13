import { z } from "zod"
import type { ConditionDef } from "../../types"

/** The customer is in at least one of the given groups (the session's `groupIds`). */
export const customerGroup: ConditionDef<{ groupIds: number[] }> = {
  code: "customerGroup",
  args: z.object({ groupIds: z.array(z.number().int().positive()).min(1) }),
  check: (args, view) => view.cart.customerGroupIds.some((g) => args.groupIds.includes(g)),
}
