import { describe, expect, it } from "vitest"
import { errorCodeSchema, errorCodes, errorResultSchema } from "./errors"

describe("errors", () => {
  it("bilinen kodu çözer", () => {
    expect(errorCodeSchema.parse("INSUFFICIENT_STOCK")).toBe("INSUFFICIENT_STOCK")
    expect(errorCodes).toContain("NOT_FOUND")
  })

  it("bilinmeyen kodu reddeder", () => {
    expect(errorCodeSchema.safeParse("BOOM").success).toBe(false)
  })

  it("hata değeri: ok=false + kod, isteğe bağlı message/details", () => {
    expect(errorResultSchema.parse({ ok: false, code: "FORBIDDEN" })).toEqual({
      ok: false,
      code: "FORBIDDEN",
    })
    expect(
      errorResultSchema.parse({
        ok: false,
        code: "CONFLICT",
        message: "çakışma",
        details: { field: "code" },
      }),
    ).toMatchObject({ message: "çakışma", details: { field: "code" } })
  })

  it("ok=true ve geçersiz kod reddedilir", () => {
    expect(errorResultSchema.safeParse({ ok: true, code: "FORBIDDEN" }).success).toBe(false)
    expect(errorResultSchema.safeParse({ ok: false, code: "YOK" }).success).toBe(false)
  })
})
