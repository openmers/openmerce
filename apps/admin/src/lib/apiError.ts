import type { ErrorCode } from "@openmers/contract"
import { MalformedResponseError, ORPCError } from "@orpc/client"

export type ApiErrorCode = ErrorCode | "NETWORK"
export type ApiError = { code: ApiErrorCode; message: string }

// shortcut: English-only messages, move to Lingui catalogs with admin i18n.
const messages: Record<ApiErrorCode, string> = {
  INVALID_INPUT: "Some fields are invalid.",
  UNAUTHENTICATED: "Your session has ended or the credentials are wrong.",
  FORBIDDEN: "You do not have permission for this action.",
  NOT_FOUND: "The record was not found.",
  CONFLICT: "The record was changed by someone else. Reload and try again.",
  RATE_LIMITED: "Too many requests. Wait a moment and try again.",
  CHANNEL_UNKNOWN: "The selected channel is unknown.",
  INSUFFICIENT_STOCK: "Not enough stock.",
  IDEMPOTENCY_MISMATCH: "This request was already sent with different data.",
  CART_CHANGED: "The cart changed.",
  COUPON_EXHAUSTED: "The coupon limit is reached.",
  INVALID_TRANSITION: "This status change is not allowed.",
  REFUND_EXCEEDS: "The refund exceeds the captured amount.",
  SETUP_REQUIRED: "The store is not set up yet.",
  SETUP_DONE: "Setup is already complete.",
  INTERNAL: "Something went wrong on the server.",
  NETWORK: "The server could not be reached.",
}

// oRPC's own codes for transport-level failures (e.g. input validation) mapped to contract codes.
const aliases: Record<string, ErrorCode> = {
  BAD_REQUEST: "INVALID_INPUT",
  UNAUTHORIZED: "UNAUTHENTICATED",
  TOO_MANY_REQUESTS: "RATE_LIMITED",
  INTERNAL_SERVER_ERROR: "INTERNAL",
}

function knownCode(code: unknown): ErrorCode | undefined {
  if (typeof code !== "string") return undefined
  // `messages` lists every contract code; a type-only contract import keeps zod out of the bundle.
  if (code !== "NETWORK" && Object.hasOwn(messages, code)) return code as ErrorCode
  return aliases[code]
}

/** Shell-level errors (`{ ok: false, code }`, e.g. unknown channel) are not oRPC-encoded. */
function shellCode(error: MalformedResponseError): ErrorCode | undefined {
  const body = error.response.body
  return body && typeof body === "object" && "code" in body ? knownCode(body.code) : undefined
}

/** Any thrown value → a contract error code plus a user-facing message (no server text is shown). */
export function toApiError(error: unknown): ApiError {
  let code: ApiErrorCode = "INTERNAL"
  if (error instanceof ORPCError) code = knownCode(error.code) ?? "INTERNAL"
  else if (error instanceof MalformedResponseError) code = shellCode(error) ?? "INTERNAL"
  else if (error instanceof TypeError) code = "NETWORK"
  return { code, message: messages[code] }
}

export function apiErrorCode(error: unknown): ApiErrorCode {
  return toApiError(error).code
}
