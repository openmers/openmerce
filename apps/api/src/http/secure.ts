import { securityHeaders } from "@openmers/core"
import type { Context } from "hono"
import type { AppEnv } from "./env"

export type SecureOptions = {
  /** Verilmezse istek URL'i ve `x-forwarded-proto` okunur (ters vekil arkasında TLS). */
  https?: boolean
  appOrigins?: readonly string[]
}

/** HTTPS mi: açık ayar → istek URL'i → `x-forwarded-proto`. HSTS yalnız HTTPS yanıtında yazılır. */
export function isHttps(c: Context<AppEnv>, forced?: boolean): boolean {
  if (forced !== undefined) return forced
  return c.req.url.startsWith("https:") || c.req.header("x-forwarded-proto") === "https"
}

/**
 * API yüzeyinin güvenlik başlıkları (`06-guvenlik-ve-yetki`). Hata ve 404 yanıtları da bu yoldan
 * geçer: ara katman en dıştadır.
 */
export function secureResponse(
  c: Context<AppEnv>,
  res: Response,
  options: SecureOptions = {},
): Response {
  const headers = securityHeaders({
    surface: "api",
    https: isHttps(c, options.https),
    appOrigins: options.appOrigins,
  })
  for (const [name, value] of Object.entries(headers)) res.headers.set(name, value)
  return res
}
