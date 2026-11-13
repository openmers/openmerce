import { describe, expect, it } from "vitest"
import { DEFAULT_ORDER_NUMBER, numberPeriod, orderNumber } from "./orderNumber"

describe("orderNumber", () => {
  it("default format is year + zero-padded sequence", () => {
    expect(orderNumber(2026, 42)).toBe("2026-000042")
    expect(orderNumber(2026, 1234567)).toBe("2026-1234567")
  })

  it("period 0 drops the year, prefix and width apply", () => {
    const f = { prefix: "WEB-", width: 4, period: "none" as const }
    expect(orderNumber(0, 7, f)).toBe("WEB-0007")
  })

  it("period comes from the UTC year, or 0 without periods", () => {
    expect(numberPeriod(Date.UTC(2026, 11, 31, 23, 59))).toBe(2026)
    expect(numberPeriod(Date.UTC(2027, 0, 1), DEFAULT_ORDER_NUMBER)).toBe(2027)
    expect(numberPeriod(Date.UTC(2027, 0, 1), { ...DEFAULT_ORDER_NUMBER, period: "none" })).toBe(0)
  })

  it("rejects prefixes the SQL twin could misread", () => {
    expect(() => orderNumber(2026, 1, { ...DEFAULT_ORDER_NUMBER, prefix: "%d" })).toThrow()
    expect(() => orderNumber(2026, 1, { ...DEFAULT_ORDER_NUMBER, width: 0 })).toThrow()
  })
})
