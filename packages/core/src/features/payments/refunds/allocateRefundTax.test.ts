import { describe, expect, it } from "vitest"
import { allocateRefundTax } from "./allocateRefundTax"

const lines = [
  { orderLineId: 1, rateBp: 2000, amount: 200 },
  { orderLineId: 2, rateBp: 1000, amount: 50 },
  { orderLineId: null, rateBp: 2000, amount: 50 },
]

describe("allocateRefundTax", () => {
  it("full refund returns all tax", () => {
    const r = allocateRefundTax(1800, 1800, lines)
    expect(r.tax).toBe(300)
    expect(r.lines.map((l) => l.refundTax)).toEqual([200, 50, 50])
  })

  it("partial refund is proportional and the parts add up", () => {
    const r = allocateRefundTax(601, 1800, lines)
    expect(r.tax).toBe(100) // 601 * 300 / 1800 = 100.17
    expect(r.lines.reduce((n, l) => n + l.refundTax, 0)).toBe(r.tax)
  })

  it("rounds half up", () => {
    expect(allocateRefundTax(3, 6, [{ orderLineId: 1, rateBp: 0, amount: 1 }]).tax).toBe(1)
  })

  it("no tax lines or zero gross gives zero", () => {
    expect(allocateRefundTax(100, 1000, []).tax).toBe(0)
    expect(allocateRefundTax(0, 0, lines).tax).toBe(0)
  })

  it("rejects a refund above the order total", () => {
    expect(() => allocateRefundTax(1801, 1800, lines)).toThrow()
  })
})
