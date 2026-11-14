import { media } from "@openmers/db"
import { newPublicId } from "../../ids"
import {
  EXTENSIONS,
  LINK_TTL_SECONDS,
  type MediaCtx,
  MediaError,
  type UploadPolicy,
} from "../types"
import type { SniffedMime } from "./sniffMagic"

export type CreateUploadInput = {
  /** Declared by the client; verified from the bytes on confirm. */
  mime: string
  bytes: number
  policy: UploadPolicy
  bucket: "public" | "private"
  /** Path inside the namespace, e.g. `personalization/<cart public id>` or `media`. */
  prefix: string
  owner?: { kind: "cart" | "order"; id: number }
}

export type CreatedUpload = {
  id: string
  /** Direct `PUT` to storage: the body never passes the API (Worker body limit does not apply). */
  uploadUrl: string
  headers: Record<string, string>
  expiresAt: number
}

/**
 * Step 1 of an upload (12-medya): checks the declared type/size against the policy, writes a
 * `pending` media row and returns a 15-minute signed `PUT` URL. The key is random, never reused,
 * so objects are immutable and safe to cache for a year.
 */
export async function createUpload(
  ctx: MediaCtx,
  input: CreateUploadInput,
): Promise<CreatedUpload> {
  const mime = input.policy.mimes.find((m) => m === input.mime)
  if (!mime) throw new MediaError("INVALID_INPUT", "file type not allowed")
  if (
    !Number.isSafeInteger(input.bytes) ||
    input.bytes < 1 ||
    input.bytes > input.policy.maxBytes
  ) {
    throw new MediaError("INVALID_INPUT", `file must be 1..${input.policy.maxBytes} bytes`)
  }
  if (!/^[a-z0-9_-]+(\/[a-z0-9_-]+)*$/i.test(input.prefix)) {
    throw new MediaError("INVALID_INPUT", "invalid key prefix")
  }
  const publicId = newPublicId("med_")
  const name = crypto.randomUUID().replaceAll("-", "")
  const key = `${input.bucket}/${input.prefix}/${name}.${EXTENSIONS[mime as SniffedMime]}`
  const p = ctx.platform
  await p.atomic([
    p.db
      .insert(media)
      .values({
        publicId,
        status: "pending",
        bucket: input.bucket,
        key,
        mime,
        bytes: input.bytes,
        ownerKind: input.owner?.kind ?? null,
        ownerId: input.owner?.id ?? null,
        createdAt: ctx.now,
        updatedAt: ctx.now,
      })
      .toSQL(),
  ])
  const uploadUrl = await p.storage.signedUrl(key, {
    method: "PUT",
    expiresIn: LINK_TTL_SECONDS,
    now: ctx.now,
  })
  return {
    id: publicId,
    uploadUrl,
    headers: { "content-type": mime },
    expiresAt: ctx.now + LINK_TTL_SECONDS * 1000,
  }
}
