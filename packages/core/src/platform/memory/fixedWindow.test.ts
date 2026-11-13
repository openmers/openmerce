import { describe, expect, it } from "vitest"
import { createFixedWindow } from "./fixedWindow"

describe("createFixedWindow", () => {
  it("pencere başına limit kadar izin verir, sonra retryAfter (saniye) döner", () => {
    const rl = createFixedWindow({ limit: 2, windowMs: 10_000 })
    expect(rl.hit("ip", 0)).toEqual({ ok: true })
    expect(rl.hit("ip", 1000)).toEqual({ ok: true })
    expect(rl.hit("ip", 2500)).toEqual({ ok: false, retryAfter: 8 })
  })

  it("pencere dolunca sayaç sıfırlanır", () => {
    const rl = createFixedWindow({ limit: 1, windowMs: 1000 })
    expect(rl.hit("ip", 0).ok).toBe(true)
    expect(rl.hit("ip", 999).ok).toBe(false)
    expect(rl.hit("ip", 1000).ok).toBe(true)
  })

  it("anahtarlar birbirinden bağımsız", () => {
    const rl = createFixedWindow({ limit: 1, windowMs: 1000 })
    expect(rl.hit("a", 0).ok).toBe(true)
    expect(rl.hit("b", 0).ok).toBe(true)
    expect(rl.hit("a", 0).ok).toBe(false)
  })
})
