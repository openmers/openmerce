import { z } from "zod"
import type { ConditionDef } from "../../types"

export const CUSTOMER_ORDER_COUNT = "customerOrderCount"

/**
 * First order: the customer's order count is 0. The data arrives in the cart round trip via `requires`; if the
 * customer is unknown (guest) there is no value and the condition does not hold.
 */
export const firstOrder: ConditionDef<Record<string, never>> = {
  code: "firstOrder",
  args: z.object({}).strict() as z.ZodType<Record<string, never>>,
  requires: [CUSTOMER_ORDER_COUNT],
  check: (_args, view) => view.cart.data[CUSTOMER_ORDER_COUNT] === 0,
}
