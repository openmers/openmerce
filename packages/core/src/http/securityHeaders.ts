/**
 * Güvenlik başlıkları: tek saf fonksiyon (`06-guvenlik-ve-yetki`). Hono bağlaması `api/app.ts`
 * işidir; burada nonce üretilmez, dışarıdan verilir. Kökenler doğrulanır: başlık enjeksiyonu
 * (`;`, boşluk, satır sonu) ve CSP'den kaçış (`'`, parantez, virgül) reddedilir.
 */
export type Surface = "shop" | "admin" | "api"

export type SecurityHeadersInput = {
  surface: Surface
  /** Yalnız HTTPS yanıtında HSTS yazılır. */
  https: boolean
  /** Vitrin/admin `script-src` nonce'u; CSP `'nonce-…'` içinde kullanılır. */
  nonce?: string
  /** Admin'e kurulu app'lerin kökenleri; admin CSP `frame-src` yalnız bunlardır. */
  appOrigins?: readonly string[]
  /** Etkin ödeme yönteminin kökenleri; `script-src`/`frame-src`/`connect-src`'e eklenir. */
  paymentOrigins?: readonly string[]
  /** Kanal CDN'inin kökeni; `img-src`'e eklenir. */
  cdnOrigin?: string
  /** Başlık adı `Content-Security-Policy-Report-Only` olur (önce gözlem modu). */
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

// Köken: şema://host[:port]. Yol, sorgu, kimlik bilgisi ve boşluk kabul edilmez.
const ORIGIN = /^[a-z][a-z0-9+.-]*:\/\/[^\s/?#;,'"()\\]+$/i
// CSP nonce: base64 benzeri, tırnak/boşluk içeremez.
const NONCE = /^[A-Za-z0-9+/=_-]{8,256}$/

function fail(code: SecurityHeaderErrorCode, message: string): never {
  throw new SecurityHeaderError(code, message)
}

/** Tek köken doğrular; kuyruk eğik çizgisi (yaygın yapılandırma) kırpılır. */
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

/** Yüzeye göre başlık kümesi. Aynı fonksiyon storefront, admin ve API yanıtlarına uygulanır. */
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
