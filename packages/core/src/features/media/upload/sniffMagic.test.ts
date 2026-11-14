import { gif, jpeg, png, webpExtended, webpLossless, webpLossy } from "@openmers/test-utils"
import { describe, expect, it } from "vitest"
import { sniffMagic } from "./sniffMagic"

const text = (s: string) => new TextEncoder().encode(s)

describe("sniffMagic", () => {
  it("reads PNG type and size from IHDR", () => {
    expect(sniffMagic(png(640, 480))).toEqual({ mime: "image/png", width: 640, height: 480 })
  })

  it("reads JPEG size from the SOF marker behind an APP segment", () => {
    expect(sniffMagic(jpeg(1200, 800))).toEqual({ mime: "image/jpeg", width: 1200, height: 800 })
  })

  it("reads all three WebP variants", () => {
    expect(sniffMagic(webpLossy(300, 200))).toEqual({ mime: "image/webp", width: 300, height: 200 })
    expect(sniffMagic(webpLossless(17, 9))).toEqual({ mime: "image/webp", width: 17, height: 9 })
    expect(sniffMagic(webpExtended(4000, 3000))).toEqual({
      mime: "image/webp",
      width: 4000,
      height: 3000,
    })
  })

  it("reads GIF size", () => {
    expect(sniffMagic(gif(10, 20))).toEqual({ mime: "image/gif", width: 10, height: 20 })
  })

  it("rejects SVG, HTML and unknown bytes", () => {
    expect(sniffMagic(text('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull()
    expect(sniffMagic(text('<?xml version="1.0"?><svg/>'))).toBeNull()
    expect(sniffMagic(text("<html><script>alert(1)</script></html>"))).toBeNull()
    expect(sniffMagic(new Uint8Array([0, 1, 2, 3]))).toBeNull()
  })

  it("rejects truncated headers and zero sizes", () => {
    expect(sniffMagic(png(640, 480).slice(0, 18))).toBeNull()
    expect(sniffMagic(png(0, 10))).toBeNull()
    expect(sniffMagic(jpeg(10, 10).slice(0, 8))).toBeNull()
  })
})
