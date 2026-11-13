import { describe, expect, it } from "vitest"
import { setupGate } from "./setupGate"

const NOW = 1_700_000_000_000

describe("setupGate", () => {
  it("kurulum bitmeden Admin'de yalnız kurulum prosedürü açık", () => {
    const pending = { surface: "admin", setupCompletedAt: null } as const
    expect(setupGate({ ...pending, procedure: "setup.createOwner" })).toEqual({ allow: true })
    expect(setupGate({ ...pending, procedure: "orders.list" })).toEqual({
      allow: false,
      reason: "SETUP_REQUIRED",
    })
    // önek benzeri ad kurulum sayılmaz
    expect(setupGate({ ...pending, procedure: "setupX.run" }).allow).toBe(false)
  })

  it("kurulum bitince kurulum kapısı kilitlenir, diğer prosedürler açılır", () => {
    const done = { surface: "admin", setupCompletedAt: NOW } as const
    expect(setupGate({ ...done, procedure: "setup.createOwner" })).toEqual({
      allow: false,
      reason: "SETUP_DONE",
    })
    expect(setupGate({ ...done, procedure: "orders.list" })).toEqual({ allow: true })
  })

  it("vitrin yüzeyi kurulum durumundan etkilenmez", () => {
    expect(setupGate({ surface: "shop", procedure: "health", setupCompletedAt: null })).toEqual({
      allow: true,
    })
  })
})
