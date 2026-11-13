import { describe, expect, it } from "vitest"
import { SecurityHeaderError, type SecurityHeadersInput, securityHeaders } from "./securityHeaders"

const surfaces = ["shop", "admin", "api"] as const

const headers = (over: Partial<SecurityHeadersInput> = {}) =>
  securityHeaders({ surface: "shop", https: true, nonce: "r4nd0mN0nceValue", ...over })

const cspOf = (h: Record<string, string>) => h["Content-Security-Policy"] ?? ""

describe("securityHeaders: common headers", () => {
  it.each(surfaces)("%s: HSTS + required headers over HTTPS", (surface) => {
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

  it.each(surfaces)("%s: no HSTS over HTTP, the others present", (surface) => {
    const h = headers({ surface, https: false })
    expect(h["Strict-Transport-Security"]).toBeUndefined()
    expect(h["X-Content-Type-Options"]).toBe("nosniff")
    expect(h["X-Frame-Options"]).toBe("DENY")
  })

  it("payment origins are only allowed under payment in Permissions-Policy", () => {
    const h = headers({ paymentOrigins: ["https://pay.example"] })
    expect(h["Permissions-Policy"]).toBe(
      'camera=(), microphone=(), geolocation=(), payment=("https://pay.example")',
    )
    expect(headers()["Permissions-Policy"]).toContain("payment=()")
  })

  it("reportOnly changes the header name, no enforcing CSP is written", () => {
    const h = headers({ reportOnly: true })
    expect(h["Content-Security-Policy-Report-Only"]).toContain("frame-ancestors 'none'")
    expect(h["Content-Security-Policy"]).toBeUndefined()
  })
})

describe("securityHeaders: CSP profiles", () => {
  it("storefront: default-src 'self', nonce, CDN images, payment origins", () => {
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

  it("storefront: frame-src 'none' without payments", () => {
    expect(cspOf(headers())).toContain("frame-src 'none'")
  })

  it("admin: frame-src only installed app origins (payment origins do not leak)", () => {
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

  it("admin: frame-src 'none' when no app is installed", () => {
    expect(cspOf(headers({ surface: "admin" }))).toContain("frame-src 'none'")
  })

  it("api: default-src 'none' and framing forbidden", () => {
    const csp = cspOf(headers({ surface: "api" }))
    expect(csp).toBe("default-src 'none'; frame-ancestors 'none'")
    expect(csp).not.toContain("script-src")
  })
})

describe("securityHeaders: input validation (header injection)", () => {
  const bad = [
    "https://app.example; script-src *",
    "https://app.example inside",
    "https://app.example\nX-Evil: 1",
    "https://app.example\r\nX-Evil: 1",
    "https://app.example'",
    "https://app.example)",
  ]

  it.each(bad)("appOrigins rejects: %j", (value) => {
    expect(() => headers({ surface: "admin", appOrigins: [value] })).toThrow(SecurityHeaderError)
  })

  it.each(bad)("paymentOrigins rejects: %j", (value) => {
    expect(() => headers({ paymentOrigins: [value] })).toThrow(SecurityHeaderError)
  })

  it.each(bad)("cdnOrigin rejects: %j", (value) => {
    expect(() => headers({ cdnOrigin: value })).toThrow(SecurityHeaderError)
  })

  it("an origin carrying a path or query is rejected", () => {
    expect(() => headers({ cdnOrigin: "https://cdn.example/x" })).toThrow(SecurityHeaderError)
    expect(() => headers({ cdnOrigin: "https://cdn.example?x=1" })).toThrow(SecurityHeaderError)
  })

  it("a trailing slash is trimmed", () => {
    expect(cspOf(headers({ cdnOrigin: "https://cdn.example/" }))).toContain(
      "img-src 'self' data: https://cdn.example",
    )
  })

  it("the nonce cannot contain quotes/spaces", () => {
    expect(() => headers({ nonce: "abc'def" })).toThrow(
      expect.objectContaining({ code: "INVALID_NONCE" }),
    )
    expect(() => headers({ nonce: "short" })).toThrow(SecurityHeaderError)
  })
})
