import { z } from "zod"
import type { CalculatorDef } from "../types"
import { fallbackArg, pickTier, type Tier, tierArgs } from "./tiers"

/** Ağırlık kademesi (gram). Bilinmeyen ağırlık: `fallbackAmount` varsa o, yoksa uygun değil. */
export const weightTier: CalculatorDef<{ tiers: Tier[]; fallbackAmount?: number }> = {
  code: "weightTier",
  args: z.object({ tiers: tierArgs, ...fallbackArg }),
  calculate: (args, parcel) => {
    if (parcel.weightGrams === null) {
      return args.fallbackAmount === undefined
        ? { ok: false, reason: "unknown_weight" }
        : { ok: true, amount: args.fallbackAmount }
    }
    const tier = pickTier(args.tiers, parcel.weightGrams)
    return tier ? { ok: true, amount: tier.amount } : { ok: false, reason: "out_of_range" }
  },
}
