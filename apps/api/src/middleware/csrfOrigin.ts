import type { MiddlewareHandler } from "hono"
import type { AppEnv } from "../http/env"
import { apiError } from "../http/errors"

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])
// Body types a browser can send cross-origin without a CORS preflight.
const FORM_TYPES = ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"]
/** Signed webhook paths: the provider is not a browser, the signature is verified. */
export const WEBHOOK_PREFIX = "/hooks/"

function isFormType(contentType: string | undefined): boolean {
  const type = contentType?.split(";")[0]?.trim().toLowerCase()
  return type !== undefined && FORM_TYPES.includes(type)
}

function originHost(origin: string | undefined): string | null {
  if (!origin || origin === "null") return null
  try {
    return new URL(origin).host
  } catch {
    return null
  }
}

/**
 * CSRF (`06-guvenlik-ve-yetki`): a state-changing, form-typed request whose `Origin` does not match
 * the request Host (or is missing) gets 403. JSON requests need a browser preflight and are out of scope;
 * requests with an `Authorization` header cannot come from a browser form; signed webhook paths are exempt.
 */
export function csrfOrigin(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (SAFE_METHODS.has(c.req.method)) return next()
    if (!isFormType(c.req.header("content-type"))) return next()
    if (c.req.header("authorization")) return next()
    if (c.req.path.startsWith(WEBHOOK_PREFIX)) return next()
    const host = c.req.header("host") ?? new URL(c.req.url).host
    if (originHost(c.req.header("origin")) !== host) return apiError(c, 403, "FORBIDDEN")
    return next()
  }
}
