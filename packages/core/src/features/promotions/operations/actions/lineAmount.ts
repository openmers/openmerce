import { z } from "zod"
import type { ActionDef, Discount } from "../../types"
import {
  matchesFilter,
  type ProductFilter,
  productFilterArgs,
} from "../conditions/containsProducts"

/** Süzgece uyan satırlara birim başına `amount` indirim; satırın kalanına kırpılır. */
export const lineAmount: ActionDef<ProductFilter & { amount: number }> = {
  code: "lineAmount",
  args: productFilterArgs.extend({ amount: z.number().int().min(1) }),
  run: (args, state) =>
    state.lines
      .filter((s) => matchesFilter(s.line, args))
      .map(
        (s): Discount => ({
          target: "line",
          lineKey: s.line.key,
          amount: Math.min(s.remaining, args.amount * s.line.quantity),
        }),
      ),
}
