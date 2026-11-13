// File storage: Cloudflare R2, self-host disk or S3-compatible.
export type StorageBody = ReadableStream<Uint8Array> | ArrayBuffer | Uint8Array | string

export type StorageMeta = { size: number; contentType?: string; etag?: string }

export type StorageObject = StorageMeta & { body: ReadableStream<Uint8Array> }

export type Storage = {
  put(key: string, body: StorageBody, opts?: { contentType?: string }): Promise<void>
  /** `null` if missing. */
  get(key: string): Promise<StorageObject | null>
  /** Passes silently if missing. */
  delete(key: string): Promise<void>
  /** Metadata without the body; `null` if missing. */
  head(key: string): Promise<StorageMeta | null>
}
