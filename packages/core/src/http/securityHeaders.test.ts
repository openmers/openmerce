import { describe, expect, it } from "vitest"
import { SecurityHeaderError, type SecurityHeadersInput, securityHeaders } from "./securityHeaders"

const surfaces = ["shop", "admin", "api"] as const

const headers = (over: Partial<SecurityHeadersInput> = {}) =>
  securityHeaders({ surface: "shop", https: true, nonce: "r4nd0mN0nceValue", ...over })

const cspOf = (h: Record<string, string>) => h["Content-Security-Policy"] ?? ""

describe("securityHeaders: ortak başlıklar", () => {
  it.each(surfaces)("%s: HTTPS'te HSTS + zorunlu başlıklar", (surface) => {
    const h = headers({ surface })
    expect(h["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains")
    expect(h["X-Content-Type-Options"]).toBe("nosniff")
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin")
    expect(h["Permissions-Policy"]).toContain("camera=()")
    expect(h["Permissions-Policy"]).toContain("microphone=()")
    expect(h["Permissions-Policy"]).toContain("geolocation=()")
    expect(h["X-Frame-Options"]).toBe("DENY")
    expect(cspOf(h)).toContain("frame-ancestors 'none'")
  })

  it.each(surfaces)("%s: HTTP'te HSTS yok, diğerleri var", (surface) => {
    const h = headers({ surface, https: false })
    expect(h["Strict-Transport-Security"]).toBeUndefined()
    expect(h["X-Content-Type-Options"]).toBe("nosniff")
    expect(h["X-Frame-Options"]).toBe("DENY")
  })

  it("ödeme kökenleri Permissions-Policy'de yalnız payment'ta açılır", () => {
    const h = headers({ paymentOrigins: ["https://pay.example"] })
    expect(h["Permissions-Policy"]).toBe(
      'camera=(), microphone=(), geolocation=(), payment=("https://pay.example")',
    )
    expect(headers()["Permissions-Policy"]).toContain("payment=()")
  })

  it("reportOnly başlık adını değiştirir, zorlayıcı CSP yazılmaz", () => {
    const h = headers({ reportOnly: true })
    expect(h["Content-Security-Policy-Report-Only"]).toContain("frame-ancestors 'none'")
    expect(h["Content-Security-Policy"]).toBeUndefined()
  })
})

describe("securityHeaders: CSP profilleri", () => {
  it("vitrin: default-src 'self', nonce, CDN görseli, ödeme kökenleri", () => {
    const csp = cspOf(
      headers({
        cdnOrigin: "https://cdn.example",
        paymentOrigins: ["https://pay.example"],
      }),
    )
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self' 'nonce-r4nd0mN0nceValue' https://pay.example")
    expect(csp).toContain("img-src 'self' data: https://cdn.example")
    expect(csp).toContain("connect-src 'self' https://pay.example")
    expect(csp).toContain("frame-src https://pay.example")
  })

  it("vitrin: ödeme yoksa frame-src 'none'", () => {
    expect(cspOf(headers())).toContain("frame-src 'none'")
  })

  it("admin: frame-src yalnız kurulu app kökenleri (ödeme kökeni sızmaz)", () => {
    const csp = cspOf(
      headers({
        surface: "admin",
        appOrigins: ["https://app1.example", "https://app2.example"],
        paymentOrigins: ["https://pay.example"],
      }),
    )
    const frameSrc = csp.split("; ").find((d) => d.startsWith("frame-src "))
    expect(frameSrc).toBe("frame-src https://app1.example https://app2.example")
  })

  it("admin: kurulu app yokken frame-src 'none'", () => {
    expect(cspOf(headers({ surface: "admin" }))).toContain("frame-src 'none'")
  })

  it("api: default-src 'none' ve çerçeve yasak", () => {
    const csp = cspOf(headers({ surface: "api" }))
    expect(csp).toBe("default-src 'none'; frame-ancestors 'none'")
    expect(csp).not.toContain("script-src")
  })
})

describe("securityHeaders: girdi doğrulama (başlık enjeksiyonu)", () => {
  const bad = [
    "https://app.example; script-src *",
    "https://app.example inside",
    "https://app.example\nX-Evil: 1",
    "https://app.example\r\nX-Evil: 1",
    "https://app.example'",
    "https://app.example)",
  ]

  it.each(bad)("appOrigins reddeder: %j", (value) => {
    expect(() => headers({ surface: "admin", appOrigins: [value] })).toThrow(SecurityHeaderError)
  })

  it.each(bad)("paymentOrigins reddeder: %j", (value) => {
    expect(() => headers({ paymentOrigins: [value] })).toThrow(SecurityHeaderError)
  })

  it.each(bad)("cdnOrigin reddeder: %j", (value) => {
    expect(() => headers({ cdnOrigin: value })).toThrow(SecurityHeaderError)
  })

  it("yol ve sorgu taşıyan köken reddedilir", () => {
    expect(() => headers({ cdnOrigin: "https://cdn.example/x" })).toThrow(SecurityHeaderError)
    expect(() => headers({ cdnOrigin: "https://cdn.example?x=1" })).toThrow(SecurityHeaderError)
  })

  it("kuyruk eğik çizgisi kırpılır", () => {
    expect(cspOf(headers({ cdnOrigin: "https://cdn.example/" }))).toContain(
      "img-src 'self' data: https://cdn.example",
    )
  })

  it("nonce tırnak/boşluk içeremez", () => {
    expect(() => headers({ nonce: "abc'def" })).toThrow(
      expect.objectContaining({ code: "INVALID_NONCE" }),
    )
    expect(() => headers({ nonce: "short" })).toThrow(SecurityHeaderError)
  })
})
