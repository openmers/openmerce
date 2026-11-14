// Minimal image headers for upload tests: only the bytes a type/size sniffer reads, no pixels.

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(
    parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)),
  )

const be16 = (n: number) => [(n >> 8) & 0xff, n & 0xff]
const be32 = (n: number) => [...be16(Math.floor(n / 65_536)), ...be16(n % 65_536)]
const le16 = (n: number) => [n & 0xff, (n >> 8) & 0xff]
const le24 = (n: number) => [...le16(n & 0xffff), (n >> 16) & 0xff]

export const png = (w: number, h: number) =>
  bytes("\x89PNG\r\n\x1a\n", be32(13), "IHDR", be32(w), be32(h), [8, 6, 0, 0, 0])

/** SOI, an APP0 segment, then SOF0 (height before width). */
export const jpeg = (w: number, h: number) =>
  bytes(
    [0xff, 0xd8, 0xff, 0xe0],
    be16(16),
    "JFIF\0",
    [1, 1, 0, 0, 1, 0, 1, 0, 0],
    [0xff, 0xc0],
    be16(17),
    [8],
    be16(h),
    be16(w),
    [3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1],
  )

export const gif = (w: number, h: number) => bytes("GIF89a", le16(w), le16(h), [0, 0, 0])

const riff = (chunk: number[]) => bytes("RIFF", [0, 0, 0, 0], "WEBP", chunk)

export const webpLossy = (w: number, h: number) =>
  riff([...bytes("VP8 "), 0, 0, 0, 0, 0, 0, 0, 0x9d, 0x01, 0x2a, ...le16(w), ...le16(h)])

export const webpLossless = (w: number, h: number) => {
  const bits = (w - 1) | ((h - 1) << 14)
  return riff([...bytes("VP8L"), 0, 0, 0, 0, 0x2f, ...le16(bits & 0xffff), ...le16(bits >>> 16)])
}

export const webpExtended = (w: number, h: number) =>
  riff([...bytes("VP8X"), 10, 0, 0, 0, 0, 0, 0, 0, ...le24(w - 1), ...le24(h - 1)])
