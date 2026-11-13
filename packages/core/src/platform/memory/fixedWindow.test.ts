import { describe, expect, it } from "vitest"
import { createFixedWindow } from "./fixedWindow"

describe("createFixedWindow", () => {
  it("allows up to the limit per window, then returns retryAfter (seconds)", () => {
    const rl = createFixedWindow({ limit: 2, windowMs: 10_000 })
    expect(rl.hit("ip", 0)).toEqual({ ok: true })
    expect(rl.hit("ip", 1000)).toEqual({ ok: true })
    expect(rl.hit("ip", 2500)).toEqual({ ok: false, retryAfter: 8 })
  })

  it("the counter resets when the window ends", () => {
    const rl = createFixedWindow({ limit: 1, windowMs: 1000 })
    expect(rl.hit("ip", 0).ok).toBe(true)
    expect(rl.hit("ip", 999).ok).toBe(false)
    expect(rl.hit("ip", 1000).ok).toBe(true)
  })

  it("keys are independent of each other", () => {
    const rl = createFixedWindow({ limit: 1, windowMs: 1000 })
    expect(rl.hit("a", 0).ok).toBe(true)
    expect(rl.hit("b", 0).ok).toBe(true)
    expect(rl.hit("a", 0).ok).toBe(false)
  })
})
