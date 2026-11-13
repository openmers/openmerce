import type { ErrorCode } from "@openmers/contract"
import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { AppEnv } from "./env"

export type ApiErrorBody = { ok: false; code: ErrorCode; requestId: string }

/**
 * Error body: only a generic code + `requestId` (`06-guvenlik-ve-yetki`: internal messages, secrets and
 * internal ids never reach the client). Mapping is the caller's job; no text is made up.
 */
export function apiErrorBody(code: ErrorCode, requestId: string): ApiErrorBody {
  return { ok: false, code, requestId }
}

export function apiError(
  c: Context<AppEnv>,
  status: ContentfulStatusCode,
  code: ErrorCode,
): Response {
  const requestId = c.get("requestId") || crypto.randomUUID()
  return c.json(apiErrorBody(code, requestId), status)
}
