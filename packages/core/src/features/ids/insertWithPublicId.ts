import type { AtomicStatement, Platform } from "../../platform"
import { newPublicId, type RandomBytes } from "./publicId"

/** 03-veri-kurallari §1: on collision the unique index is authoritative, retried three times. */
export const PUBLIC_ID_INSERT_ATTEMPTS = 3

export type InsertWithPublicIdOptions = {
  /** Prefix (`chn_` or `chn`). */
  prefix: string
  random?: RandomBytes
  /** Total number of attempts (default 3). */
  attempts?: number
}

/**
 * Only treats an error violating the `public_id` unique index as retryable; another
 * unique column (e.g. `channels.code`) is the caller's bug and is raised immediately.
 */
export function isPublicIdCollision(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /UNIQUE/i.test(message) && /public_id/i.test(message)
}

/**
 * Generates the id and builds the statement; on collision retries **with a new id** (retrying with the same id
 * gives the same error). When attempts run out, the last error is raised.
 */
export async function insertWithPublicId(
  p: Pick<Platform, "atomic">,
  build: (publicId: string) => readonly AtomicStatement[],
  opts: InsertWithPublicIdOptions,
): Promise<string> {
  const attempts = opts.attempts ?? PUBLIC_ID_INSERT_ATTEMPTS
  if (attempts < 1) throw new RangeError(`deneme sayısı en az 1 olmalı: ${attempts}`)

  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const publicId = newPublicId(opts.prefix, opts.random)
    try {
      await p.atomic(build(publicId))
      return publicId
    } catch (error) {
      if (!isPublicIdCollision(error)) throw error
      lastError = error
    }
  }
  throw lastError
}
