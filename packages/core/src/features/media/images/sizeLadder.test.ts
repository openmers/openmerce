import { describe, expect, it } from "vitest"
import { sizedKey, sizeLadder, srcset } from "./sizeLadder"

const url = (key: string) => `https://cdn.test/${key}`

describe("sizeLadder", () => {
  it("keeps only steps narrower than the original", () => {
    expect(sizeLadder(2000)).toEqual([320, 640, 1000])
    expect(sizeLadder(640)).toEqual([320])
    expect(sizeLadder(300)).toEqual([])
    expect(sizeLadder(null)).toEqual([])
  })

  it("derives sized keys as WebP next to the original", () => {
    expect(sizedKey("public/media/abc.jpg", 640)).toBe("public/media/abc_640.webp")
    expect(sizedKey("public/v1.2/abc", 320)).toBe("public/v1.2/abc_320.webp")
  })

  it("builds srcset with the original as the widest step", () => {
    expect(srcset(url, "public/a.png", [640, 320], 800)).toBe(
      "https://cdn.test/public/a_320.webp 320w, https://cdn.test/public/a_640.webp 640w, " +
        "https://cdn.test/public/a.png 800w",
    )
    expect(srcset(url, "public/a.png", [], 800)).toBeNull()
  })
})
