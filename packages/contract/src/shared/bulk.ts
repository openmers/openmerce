import { z } from "zod"
import { errorCodeSchema } from "./errors"

/** Toplu uçların sabit üst sınırı (kayıt sayısı). */
export const BULK_MAX_RECORDS = 500

/**
 * Toplu yazma girdisi `{ items }`. Üst sınır sabittir ve çağıran daha küçüğünü seçebilir;
 * sınır aşımı istisna değil doğrulama hatasıdır (tek istekte sınırsız iş yok).
 */
export function bulkInput<T extends z.ZodType>(item: T, max = BULK_MAX_RECORDS) {
  return z.object({ items: z.array(item).min(1).max(max) })
}

/** Kayıt başına sonuç: başarılı kaydın değeri ya da tipli hata kodu. */
export function bulkResult<T extends z.ZodType>(item: T) {
  return z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), index: z.number().int().nonnegative(), value: item }),
    z.object({
      ok: z.literal(false),
      index: z.number().int().nonnegative(),
      code: errorCodeSchema,
      message: z.string().max(500).optional(),
    }),
  ])
}

/** Toplu uç yanıtı: girdiyle aynı sırada, kayıt başına sonuç. */
export function bulkResults<T extends z.ZodType>(item: T) {
  return z.array(bulkResult(item))
}
