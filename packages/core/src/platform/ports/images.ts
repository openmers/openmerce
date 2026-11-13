// Yüklemede boyut üretme: Cloudflare Images binding, self-host `sharp` (yalnız Node adaptöründe).
// İsteğe bağlıdır; yoksa ya da hata verirse orijinal saklanır, yükleme bozulmaz (performans §7).
export type ImageFormat = "webp" | "jpeg" | "png"

export type Images = {
  resize(
    input: ArrayBuffer | Uint8Array,
    opts: { width: number; height?: number; format?: ImageFormat },
  ): Promise<Uint8Array>
}
