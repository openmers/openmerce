import { describe, expect, it } from "vitest"
import { cumulativeDelta } from "./cumulativeDelta"

const base = { amount: 1000, providerRefunded: 0, externalRefunded: 0 }

describe("cumulativeDelta", () => {
  it("turns an absolute total into a delta", () => {
    expect(cumulativeDelta(base, 300)).toEqual({ kind: "apply", delta: 300, providerRefunded: 300 })
    expect(cumulativeDelta({ ...base, providerRefunded: 300 }, 500)).toEqual({
      kind: "apply",
      delta: 200,
      providerRefunded: 500,
    })
  })

  it("duplicate and out-of-order events are no-ops", () => {
    expect(cumulativeDelta({ ...base, providerRefunded: 500 }, 500)).toEqual({ kind: "noop" })
    expect(cumulativeDelta({ ...base, providerRefunded: 500 }, 300)).toEqual({ kind: "noop" })
  })

  it("any delivery order of the same events ends at the same total", () => {
    const events = [300, 700, 500, 700, 300]
    const run = (order: number[]) =>
      order.reduce((total, e) => {
        const r = cumulativeDelta({ ...base, providerRefunded: total }, e)
        return r.kind === "apply" ? r.providerRefunded : total
      }, 0)
    expect(run(events)).toBe(700)
    expect(run([...events].reverse())).toBe(700)
  })

  it("counts external refunds toward the cap", () => {
    expect(cumulativeDelta({ ...base, externalRefunded: 400 }, 600).kind).toBe("apply")
    expect(cumulativeDelta({ ...base, externalRefunded: 400 }, 601)).toEqual({ kind: "exceeds" })
  })

  it("rejects negative or fractional amounts", () => {
    expect(() => cumulativeDelta(base, -1)).toThrow()
    expect(() => cumulativeDelta(base, 1.5)).toThrow()
  })
})
