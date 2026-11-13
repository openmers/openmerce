import { describe, expect, it } from "vitest"
import { errorCodeSchema, errorCodes, errorResultSchema } from "./errors"

describe("errors", () => {
  it("parses a known code", () => {
    expect(errorCodeSchema.parse("INSUFFICIENT_STOCK")).toBe("INSUFFICIENT_STOCK")
    expect(errorCodes).toContain("NOT_FOUND")
  })

  it("rejects an unknown code", () => {
    expect(errorCodeSchema.safeParse("BOOM").success).toBe(false)
  })

  it("error value: ok=false + code, optional message/details", () => {
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

  it("ok=true and an invalid code are rejected", () => {
    expect(errorResultSchema.safeParse({ ok: true, code: "FORBIDDEN" }).success).toBe(false)
    expect(errorResultSchema.safeParse({ ok: false, code: "YOK" }).success).toBe(false)
  })
})
