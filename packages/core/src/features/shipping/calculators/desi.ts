import { z } from "zod"
import type { CalculatorDef } from "../types"
import { fallbackArg, pickTier, type Tier, tierArgs } from "./tiers"

/**
 * Desi tier: desi = volume (cm³) / `divisor`. The divisor varies by carrier, no constant in code
 * (required argument). Comparison in integers: `volumeMm3 <= upTo × divisor × 1000`. For an item
 * with unknown dimensions, `fallbackAmount` if present, otherwise not eligible.
 */
export const desi: CalculatorDef<{ divisor: number; tiers: Tier[]; fallbackAmount?: number }> = {
  code: "desi",
  args: z.object({ divisor: z.number().int().positive(), tiers: tierArgs, ...fallbackArg }),
  calculate: (args, parcel) => {
    if (parcel.volumeMm3 === null) {
      return args.fallbackAmount === undefined
        ? { ok: false, reason: "unknown_size" }
        : { ok: true, amount: args.fallbackAmount }
    }
    const tier = pickTier(args.tiers, parcel.volumeMm3, args.divisor * 1000)
    return tier ? { ok: true, amount: tier.amount } : { ok: false, reason: "out_of_range" }
  },
}
