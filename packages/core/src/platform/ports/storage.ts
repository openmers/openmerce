// File storage: Cloudflare R2, self-host disk or S3-compatible.
// Keys carry their namespace as the first segment: `public/...` (CDN) or `private/...` (signed links).
export type StorageBody = ReadableStream<Uint8Array> | ArrayBuffer | Uint8Array | string

export type StorageMeta = { size: number; contentType?: string; etag?: string }

export type StorageObject = StorageMeta & { body: ReadableStream<Uint8Array> }

export type SignedUrlOptions = {
  method: "GET" | "PUT"
  /** Seconds the URL stays valid. */
  expiresIn: number
  /** Signing clock (ms); injected so links are reproducible in tests. */
  now: number
}

export type Storage = {
  put(key: string, body: StorageBody, opts?: { contentType?: string }): Promise<void>
  /** `null` if missing. */
  get(key: string): Promise<StorageObject | null>
  /** Passes silently if missing. */
  delete(key: string): Promise<void>
  /** Metadata without the body; `null` if missing. */
  head(key: string): Promise<StorageMeta | null>
  /** Public URL of a `public/` key (CDN or bucket domain); no request is made. */
  url(key: string): string
  /** Short-lived URL: direct upload (`PUT`) or a private read (`GET`); the body never passes the API. */
  signedUrl(key: string, opts: SignedUrlOptions): Promise<string>
}
