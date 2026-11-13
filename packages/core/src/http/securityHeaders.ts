/**
 * Security headers: a single pure function (`06-guvenlik-ve-yetki`). Wiring into Hono is `api/app.ts`'s
 * job; no nonce is generated here, it is passed in. Origins are validated: header injection
 * (`;`, whitespace, newline) and CSP escapes (`'`, parentheses, comma) are rejected.
 */
export type Surface = "shop" | "admin" | "api"

export type SecurityHeadersInput = {
  surface: Surface
  /** HSTS is only written on HTTPS responses. */
  https: boolean
  /** Storefront/admin `script-src` nonce; used inside CSP `'nonce-…'`. */
  nonce?: string
  /** Origins of apps installed in admin; the admin CSP `frame-src` is only these. */
  appOrigins?: readonly string[]
  /** Origins of the active payment method; added to `script-src`/`frame-src`/`connect-src`. */
  paymentOrigins?: readonly string[]
  /** Origin of the channel CDN; added to `img-src`. */
  cdnOrigin?: string
  /** The header name becomes `Content-Security-Policy-Report-Only` (observe mode first). */
  reportOnly?: boolean
}

export type SecurityHeaderErrorCode = "INVALID_ORIGIN" | "INVALID_NONCE"

export class SecurityHeaderError extends Error {
  constructor(
    readonly code: SecurityHeaderErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "SecurityHeaderError"
  }
}

// Origin: scheme://host[:port]. Paths, queries, credentials and whitespace are not accepted.
const ORIGIN = /^[a-z][a-z0-9+.-]*:\/\/[^\s/?#;,'"()\\]+$/i
// CSP nonce: base64-like, cannot contain quotes/spaces.
const NONCE = /^[A-Za-z0-9+/=_-]{8,256}$/

function fail(code: SecurityHeaderErrorCode, message: string): never {
  throw new SecurityHeaderError(code, message)
}

/** Validates a single origin; a trailing slash (common configuration) is trimmed. */
export function assertOrigin(value: string, field: string): string {
  const candidate = value.endsWith("/") ? value.slice(0, -1) : value
  if (!ORIGIN.test(candidate)) fail("INVALID_ORIGIN", `${field}: geçersiz köken`)
  return candidate
}

function originList(values: readonly string[] | undefined, field: string): string[] {
  return (values ?? []).map((value) => assertOrigin(value, field))
}

function permissionsPolicy(paymentOrigins: readonly string[]): string {
  const payment =
    paymentOrigins.length > 0 ? `(${paymentOrigins.map((o) => `"${o}"`).join(" ")})` : "()"
  return `camera=(), microphone=(), geolocation=(), payment=${payment}`
}

function contentSecurityPolicy(input: SecurityHeadersInput, payment: readonly string[]): string {
  if (input.surface === "api") return "default-src 'none'; frame-ancestors 'none'"

  const nonce = input.nonce === undefined ? undefined : assertNonce(input.nonce)
  const cdn = input.cdnOrigin === undefined ? undefined : assertOrigin(input.cdnOrigin, "cdnOrigin")
  const appOrigins = originList(input.appOrigins, "appOrigins")

  const scriptSrc = ["'self'", ...(nonce ? [`'nonce-${nonce}'`] : []), ...payment]
  const imgSrc = ["'self'", "data:", ...(cdn ? [cdn] : [])]
  const frameSrc = input.surface === "admin" ? appOrigins : payment

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    `img-src ${imgSrc.join(" ")}`,
    `connect-src ${["'self'", ...payment].join(" ")}`,
    `frame-src ${frameSrc.length > 0 ? frameSrc.join(" ") : "'none'"}`,
    "frame-ancestors 'none'",
  ].join("; ")
}

function assertNonce(nonce: string): string {
  if (!NONCE.test(nonce)) fail("INVALID_NONCE", "nonce geçersiz")
  return nonce
}

/** Header set per surface. The same function applies to storefront, admin and API responses. */
export function securityHeaders(input: SecurityHeadersInput): Record<string, string> {
  const payment = originList(input.paymentOrigins, "paymentOrigins")
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": permissionsPolicy(payment),
    "X-Frame-Options": "DENY",
  }
  if (input.https) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
  }
  const cspName = input.reportOnly
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy"
  headers[cspName] = contentSecurityPolicy(input, payment)
  return headers
}
