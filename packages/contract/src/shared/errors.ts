import { z } from "zod"

/**
 * Ortak hata kodları: beklenen hatalar değer olarak döner (`{ ok: false, code }`);
 * istemci tipli koda göre dallanır (`02-api-ve-istek-baglami` §3).
 */
export const errorCodes = [
  "INVALID_INPUT",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "CHANNEL_UNKNOWN",
  "INSUFFICIENT_STOCK",
  "IDEMPOTENCY_MISMATCH",
  "INTERNAL",
] as const

export const errorCodeSchema = z.enum(errorCodes)

export type ErrorCode = z.infer<typeof errorCodeSchema>

/** `message` istemciye gider: sır ve iç kimlik konmaz. */
export const errorResultSchema = z.object({
  ok: z.literal(false),
  code: errorCodeSchema,
  message: z.string().max(500).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
})

export type ErrorResult = z.infer<typeof errorResultSchema>
