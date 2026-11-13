import type { ErrorCode } from "@openmers/contract"
import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { AppEnv } from "./env"

export type ApiErrorBody = { ok: false; code: ErrorCode; requestId: string }

/**
 * Hata gövdesi: yalnız genel kod + `requestId` (`06-guvenlik-ve-yetki`: iç ileti, sır ve iç kimlik
 * istemciye gitmez). Eşleme çağıranın işidir; metin uydurulmaz.
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
