// Generating sizes on upload: Cloudflare Images binding, self-host `sharp` (Node adapter only).
// Optional; if missing or failing, the original is stored and the upload does not break (performance §7).
export type ImageFormat = "webp" | "jpeg" | "png"

export type Images = {
  resize(
    input: ArrayBuffer | Uint8Array,
    opts: { width: number; height?: number; format?: ImageFormat },
  ): Promise<Uint8Array>
}
