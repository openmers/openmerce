import { z } from "zod"
import { type ActionDef, type Discount, percentOf } from "../../types"
import {
  matchesFilter,
  type ProductFilter,
  productFilterArgs,
} from "../conditions/containsProducts"

/** A discount of `bp` basis points of the remaining amount on lines matching the filter (10000 = 100%). */
export const linePercent: ActionDef<ProductFilter & { bp: number }> = {
  code: "linePercent",
  args: productFilterArgs.extend({ bp: z.number().int().min(1).max(10_000) }),
  run: (args, state) =>
    state.lines
      .filter((s) => matchesFilter(s.line, args))
      .map(
        (s): Discount => ({
          target: "line",
          lineKey: s.line.key,
          amount: Math.min(s.remaining, percentOf(s.remaining, args.bp)),
        }),
      ),
}
