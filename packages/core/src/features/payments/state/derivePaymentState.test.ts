import { describe, expect, it } from "vitest"
import { derivePaymentState } from "./derivePaymentState"

describe("derivePaymentState", () => {
  it("no payments is awaiting", () => {
    expect(derivePaymentState(1000, [])).toBe("awaiting")
  })

  it("authorization covering the total is authorized, partial is awaiting", () => {
    expect(derivePaymentState(1000, [{ state: "authorized", amount: 1000, refunded: 0 }])).toBe(
      "authorized",
    )
    expect(derivePaymentState(1000, [{ state: "authorized", amount: 400, refunded: 0 }])).toBe(
      "awaiting",
    )
  })

  it("settled total is paid, split payments add up", () => {
    expect(derivePaymentState(1000, [{ state: "settled", amount: 1000, refunded: 0 }])).toBe("paid")
    expect(
      derivePaymentState(1000, [
        { state: "settled", amount: 600, refunded: 0 },
        { state: "settled", amount: 400, refunded: 0 },
      ]),
    ).toBe("paid")
  })

  it("refunds make it partially refunded, then refunded", () => {
    expect(derivePaymentState(1000, [{ state: "settled", amount: 1000, refunded: 1 }])).toBe(
      "partially_refunded",
    )
    expect(derivePaymentState(1000, [{ state: "settled", amount: 1000, refunded: 1000 }])).toBe(
      "refunded",
    )
  })

  it("declined and cancelled payments do not count", () => {
    expect(
      derivePaymentState(1000, [
        { state: "declined", amount: 1000, refunded: 0 },
        { state: "cancelled", amount: 1000, refunded: 0 },
      ]),
    ).toBe("awaiting")
  })
})
