// Dosya deposu: Cloudflare R2, self-host disk veya S3 uyumlu.
export type StorageBody = ReadableStream<Uint8Array> | ArrayBuffer | Uint8Array | string

export type StorageMeta = { size: number; contentType?: string; etag?: string }

export type StorageObject = StorageMeta & { body: ReadableStream<Uint8Array> }

export type Storage = {
  put(key: string, body: StorageBody, opts?: { contentType?: string }): Promise<void>
  /** Yoksa `null`. */
  get(key: string): Promise<StorageObject | null>
  /** Yoksa sessizce geçer. */
  delete(key: string): Promise<void>
  /** Gövdesiz üst veri; yoksa `null`. */
  head(key: string): Promise<StorageMeta | null>
}
