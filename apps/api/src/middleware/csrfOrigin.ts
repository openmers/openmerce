import type { MiddlewareHandler } from "hono"
import type { AppEnv } from "../http/env"
import { apiError } from "../http/errors"

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])
// Tarayıcının ön uçuşsuz (CORS preflight'sız) çapraz kökenden gönderebildiği gövde tipleri.
const FORM_TYPES = ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"]
/** İmzalı webhook yolları: sağlayıcı tarayıcı değildir, imza doğrulanır. */
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
 * CSRF (`06-guvenlik-ve-yetki`): durum değiştiren, form tipli istekte `Origin` isteğin Host'u ile
 * eşleşmezse (ya da yoksa) 403. JSON istekleri tarayıcıda ön uçuş ister, kapsam dışı; `Authorization`
 * başlıklı istek tarayıcı formundan gelemez; imzalı webhook yolu muaf.
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
