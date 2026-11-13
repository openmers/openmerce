import { z } from "zod"
import type { ConditionDef } from "../../types"

export const CUSTOMER_ORDER_COUNT = "customerOrderCount"

/**
 * İlk sipariş: müşterinin sipariş sayısı 0. Veri sepet turunda `requires` ile gelir; müşteri
 * bilinmiyorsa (misafir) değer yoktur ve koşul tutmaz.
 */
export const firstOrder: ConditionDef<Record<string, never>> = {
  code: "firstOrder",
  args: z.object({}).strict() as z.ZodType<Record<string, never>>,
  requires: [CUSTOMER_ORDER_COUNT],
  check: (_args, view) => view.cart.data[CUSTOMER_ORDER_COUNT] === 0,
}
