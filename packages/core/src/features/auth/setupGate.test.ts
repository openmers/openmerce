import { describe, expect, it } from "vitest"
import { setupGate } from "./setupGate"

const NOW = 1_700_000_000_000

describe("setupGate", () => {
  it("before setup only the setup procedure is open on Admin", () => {
    const pending = { surface: "admin", setupCompletedAt: null } as const
    expect(setupGate({ ...pending, procedure: "setup.createOwner" })).toEqual({ allow: true })
    expect(setupGate({ ...pending, procedure: "orders.list" })).toEqual({
      allow: false,
      reason: "SETUP_REQUIRED",
    })
    // a prefix-like name does not count as setup
    expect(setupGate({ ...pending, procedure: "setupX.run" }).allow).toBe(false)
  })

  it("after setup the setup gate locks and the other procedures open", () => {
    const done = { surface: "admin", setupCompletedAt: NOW } as const
    expect(setupGate({ ...done, procedure: "setup.createOwner" })).toEqual({
      allow: false,
      reason: "SETUP_DONE",
    })
    expect(setupGate({ ...done, procedure: "orders.list" })).toEqual({ allow: true })
  })

  it("the storefront surface is not affected by setup state", () => {
    expect(setupGate({ surface: "shop", procedure: "health", setupCompletedAt: null })).toEqual({
      allow: true,
    })
  })
})
