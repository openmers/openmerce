import { z } from "zod"
import type { CalculatorDef } from "../types"
import { fallbackArg, pickTier, type Tier, tierArgs } from "./tiers"

/**
 * Desi kademesi: desi = hacim (cm³) / `divisor`. Bölen taşıyıcıya göre değişir, kodda sabit yok
 * (zorunlu argüman). Karşılaştırma tamsayıda: `hacimMm3 <= upTo × divisor × 1000`. Ölçüsü
 * bilinmeyen kalemde `fallbackAmount` varsa o, yoksa uygun değil.
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
