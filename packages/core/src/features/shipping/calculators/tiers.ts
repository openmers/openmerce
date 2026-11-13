import { z } from "zod"

/** Tier: `upTo` is an inclusive upper bound; `null` = unbounded (last tier only). */
export type Tier = { upTo: number | null; amount: number }

const money = z.number().int().min(0)

export const tierArgs = z
  .array(z.object({ upTo: z.number().int().positive().nullable(), amount: money }))
  .min(1)
  .refine(
    (tiers) =>
      tiers.every((t, i) => {
        const prev = tiers[i - 1]
        if (!prev) return true
        return prev.upTo !== null && (t.upTo === null || t.upTo > prev.upTo)
      }),
    "kademeler artan sırada, sınırsız kademe yalnız sonda",
  )

/** Fallback fee for unknown weight/dimensions; without it the method is not eligible. */
export const fallbackArg = { fallbackAmount: money.optional() }

/**
 * A value falls into a single tier (tiers do not accumulate): the first tier with `value <= upTo`. If the last tier
 * is finite, anything above it is out of service (`undefined`). `scale` converts the tier bound to the value's unit.
 */
export function pickTier(tiers: readonly Tier[], value: number, scale = 1): Tier | undefined {
  return tiers.find((t) => t.upTo === null || value <= t.upTo * scale)
}
