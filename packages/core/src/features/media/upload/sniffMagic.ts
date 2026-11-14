// Pure: file type and pixel size from the first bytes (12-medya: the `Content-Type` header is not
// trusted). Only raster formats are recognised; SVG (scriptable XML) and anything else is `null`.

export type SniffedMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif"

export type Sniffed = { mime: SniffedMime; width: number; height: number }

/** Enough for JPEG headers behind a large EXIF/ICC block. */
export const SNIFF_BYTES = 65_536

const ascii = (b: Uint8Array, at: number, s: string) =>
  [...s].every((c, i) => b[at + i] === c.charCodeAt(0))

const u16be = (b: Uint8Array, at: number) => ((b[at] ?? 0) << 8) | (b[at + 1] ?? 0)
const u16le = (b: Uint8Array, at: number) => (b[at] ?? 0) | ((b[at + 1] ?? 0) << 8)
const u24le = (b: Uint8Array, at: number) => u16le(b, at) | ((b[at + 2] ?? 0) << 16)
const u32be = (b: Uint8Array, at: number) => u16be(b, at) * 65_536 + u16be(b, at + 2)

function jpeg(b: Uint8Array): Sniffed | null {
  let i = 2
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null
    const marker = b[i + 1] ?? 0
    if (marker === 0xff) {
      i += 1
      continue
    }
    // SOF0..SOF15 except DHT (C4), JPG (C8), DAC (CC) carry height then width
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { mime: "image/jpeg", height: u16be(b, i + 5), width: u16be(b, i + 7) }
    }
    if (marker === 0xd9 || marker === 0xda) return null
    i += 2 + u16be(b, i + 2)
  }
  return null
}

function webp(b: Uint8Array): Sniffed | null {
  const mime = "image/webp" as const
  if (ascii(b, 12, "VP8 ") && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) {
    return { mime, width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff }
  }
  if (ascii(b, 12, "VP8L") && b[20] === 0x2f) {
    const bits = (b[21] ?? 0) | ((b[22] ?? 0) << 8) | ((b[23] ?? 0) << 16) | ((b[24] ?? 0) << 24)
    return { mime, width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
  }
  if (ascii(b, 12, "VP8X")) return { mime, width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 }
  return null
}

/** `null` = not an accepted image (unknown, truncated, SVG/HTML, zero size). */
export function sniffMagic(b: Uint8Array): Sniffed | null {
  let out: Sniffed | null = null
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) out = jpeg(b)
  else if (ascii(b, 0, "\x89PNG\r\n\x1a\n") && ascii(b, 12, "IHDR")) {
    out = { mime: "image/png", width: u32be(b, 16), height: u32be(b, 20) }
  } else if (ascii(b, 0, "GIF87a") || ascii(b, 0, "GIF89a")) {
    out = { mime: "image/gif", width: u16le(b, 6), height: u16le(b, 8) }
  } else if (ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP")) out = webp(b)
  return out && out.width > 0 && out.height > 0 ? out : null
}
