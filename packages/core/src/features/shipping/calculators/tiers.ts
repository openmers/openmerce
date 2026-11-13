import { z } from "zod"

/** Kademe: `upTo` dahil üst sınır; `null` = sınırsız (yalnız son kademe). */
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

/** Bilinmeyen ağırlık/ölçüde yedek ücret; yoksa yöntem uygun sayılmaz. */
export const fallbackArg = { fallbackAmount: money.optional() }

/**
 * Değer tek kademeye düşer (kademeler birikmez): `value <= upTo` olan ilk kademe. Son kademe
 * sonluysa üstü hizmet dışıdır (`undefined`). `scale` kademe sınırını değerin birimine çevirir.
 */
export function pickTier(tiers: readonly Tier[], value: number, scale = 1): Tier | undefined {
  return tiers.find((t) => t.upTo === null || value <= t.upTo * scale)
}
