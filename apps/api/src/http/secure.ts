import { securityHeaders } from "@openmers/core"
import type { Context } from "hono"
import type { AppEnv } from "./env"

export type SecureOptions = {
  /** If not given, the request URL and `x-forwarded-proto` are read (TLS behind a reverse proxy). */
  https?: boolean
  appOrigins?: readonly string[]
}

/** Is it HTTPS: explicit setting → request URL → `x-forwarded-proto`. HSTS is only written on HTTPS responses. */
export function isHttps(c: Context<AppEnv>, forced?: boolean): boolean {
  if (forced !== undefined) return forced
  return c.req.url.startsWith("https:") || c.req.header("x-forwarded-proto") === "https"
}

/**
 * Security headers of the API surface (`06-guvenlik-ve-yetki`). Error and 404 responses also go
 * through here: the middleware is outermost.
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
