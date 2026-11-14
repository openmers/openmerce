import type { Platform } from "../../platform"
import type { SniffedMime } from "./upload/sniffMagic"

export type MediaCtx = { platform: Platform; now: number }

export type MediaErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  /** The client has not uploaded the object yet; confirm may be retried. */
  | "NOT_UPLOADED"
  /** Referenced by a product, digital asset, fulfillment or poster. */
  | "IN_USE"

export class MediaError extends Error {
  constructor(
    readonly code: MediaErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "MediaError"
  }
}

/** Server-side limits; the client-declared type and size are checked again on confirm. */
export type UploadPolicy = { mimes: readonly SniffedMime[]; maxBytes: number; maxPixels: number }

/** Customer personalization images: PNG/JPEG/WebP, 10 MB, 8000 px (12-medya). */
export const CUSTOMER_UPLOADS: UploadPolicy = {
  mimes: ["image/png", "image/jpeg", "image/webp"],
  maxBytes: 10 * 1024 * 1024,
  maxPixels: 8000,
}

/** Admin media: raster images including GIF. */
export const ADMIN_UPLOADS: UploadPolicy = {
  mimes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  maxBytes: 20 * 1024 * 1024,
  maxPixels: 8000,
}

export const EXTENSIONS: Record<SniffedMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
}

/** Signed upload and private read links live 15 minutes (12-medya). */
export const LINK_TTL_SECONDS = 900

/** Unconfirmed uploads are swept after one hour. */
export const PENDING_TTL_MS = 3_600_000
