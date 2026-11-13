import { z } from "zod"
import { errorCodeSchema } from "./errors"

/** Fixed upper limit for bulk endpoints (entry count). */
export const BULK_MAX_RECORDS = 500

/**
 * Bulk write input `{ items }`. The upper limit is fixed and the caller may choose a smaller one;
 * exceeding it is a validation error, not an exception (no unbounded work in a single request).
 */
export function bulkInput<T extends z.ZodType>(item: T, max = BULK_MAX_RECORDS) {
  return z.object({ items: z.array(item).min(1).max(max) })
}

/** Per-entry result: the successful entry's value or a typed error code. */
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

/** Bulk endpoint response: per-entry results in the same order as the input. */
export function bulkResults<T extends z.ZodType>(item: T) {
  return z.array(bulkResult(item))
}
