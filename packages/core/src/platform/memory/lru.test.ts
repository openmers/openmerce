import { describe, expect, it } from "vitest"
import { createLru } from "./lru"

describe("createLru", () => {
  it("evicts the least recently used when the limit is exceeded", () => {
    const lru = createLru<number>({ max: 2 })
    lru.set("a", 1, 0)
    lru.set("b", 2, 0)
    expect(lru.get("a", 0)).toBe(1) // a is now the newest
    lru.set("c", 3, 0)
    expect(lru.get("b", 0)).toBeUndefined()
    expect(lru.get("a", 0)).toBe(1)
    expect(lru.get("c", 0)).toBe(3)
    expect(lru.size).toBe(2)
  })

  it("after the TTL the value is gone and the entry is deleted", () => {
    const lru = createLru<string>({ max: 10, ttlMs: 100 })
    lru.set("k", "v", 1000)
    expect(lru.get("k", 1099)).toBe("v")
    expect(lru.get("k", 1100)).toBeUndefined()
    expect(lru.size).toBe(0)
  })

  it("a per-set TTL overrides the default; no TTL means no expiry", () => {
    const lru = createLru<string>({ max: 10 })
    lru.set("forever", "v", 0)
    lru.set("short", "v", 0, 10)
    expect(lru.get("forever", Number.MAX_SAFE_INTEGER)).toBe("v")
    expect(lru.get("short", 10)).toBeUndefined()
  })

  it("rewriting the same key does not grow the size; delete removes", () => {
    const lru = createLru<number>({ max: 2 })
    lru.set("a", 1, 0)
    lru.set("a", 2, 0)
    expect(lru.size).toBe(1)
    expect(lru.get("a", 0)).toBe(2)
    expect(lru.delete("a")).toBe(true)
    expect(lru.get("a", 0)).toBeUndefined()
  })

  it("an invalid max is rejected", () => {
    expect(() => createLru({ max: 0 })).toThrow(RangeError)
  })
})
