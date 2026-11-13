import { describe, expect, it } from "vitest"
import { createLru } from "./lru"

describe("createLru", () => {
  it("sınır aşılınca en az yakın zamanda kullanılanı çıkarır", () => {
    const lru = createLru<number>({ max: 2 })
    lru.set("a", 1, 0)
    lru.set("b", 2, 0)
    expect(lru.get("a", 0)).toBe(1) // a artık en yeni
    lru.set("c", 3, 0)
    expect(lru.get("b", 0)).toBeUndefined()
    expect(lru.get("a", 0)).toBe(1)
    expect(lru.get("c", 0)).toBe(3)
    expect(lru.size).toBe(2)
  })

  it("TTL dolunca değer yok ve kayıt silinir", () => {
    const lru = createLru<string>({ max: 10, ttlMs: 100 })
    lru.set("k", "v", 1000)
    expect(lru.get("k", 1099)).toBe("v")
    expect(lru.get("k", 1100)).toBeUndefined()
    expect(lru.size).toBe(0)
  })

  it("set başına TTL varsayılanı ezer; TTL yoksa süresiz", () => {
    const lru = createLru<string>({ max: 10 })
    lru.set("forever", "v", 0)
    lru.set("short", "v", 0, 10)
    expect(lru.get("forever", Number.MAX_SAFE_INTEGER)).toBe("v")
    expect(lru.get("short", 10)).toBeUndefined()
  })

  it("aynı anahtarı yeniden yazmak boyutu büyütmez; delete siler", () => {
    const lru = createLru<number>({ max: 2 })
    lru.set("a", 1, 0)
    lru.set("a", 2, 0)
    expect(lru.size).toBe(1)
    expect(lru.get("a", 0)).toBe(2)
    expect(lru.delete("a")).toBe(true)
    expect(lru.get("a", 0)).toBeUndefined()
  })

  it("geçersiz max reddedilir", () => {
    expect(() => createLru({ max: 0 })).toThrow(RangeError)
  })
})
