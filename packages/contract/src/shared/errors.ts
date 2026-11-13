import { z } from "zod"

/**
 * Shared error codes: expected errors are returned as values (`{ ok: false, code }`);
 * the client branches on the typed code (`02-api-ve-istek-baglami` §3).
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
  // Setup gate (`setupGate`): admin is closed before setup / setup is locked afterwards.
  "SETUP_REQUIRED",
  "SETUP_DONE",
  "INTERNAL",
] as const

export const errorCodeSchema = z.enum(errorCodes)

export type ErrorCode = z.infer<typeof errorCodeSchema>

/** `message` goes to the client: no secrets or internal ids. */
export const errorResultSchema = z.object({
  ok: z.literal(false),
  code: errorCodeSchema,
  message: z.string().max(500).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
})

export type ErrorResult = z.infer<typeof errorResultSchema>
