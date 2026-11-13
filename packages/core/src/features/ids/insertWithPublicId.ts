import type { AtomicStatement, Platform } from "../../platform"
import { newPublicId, type RandomBytes } from "./publicId"

/** 03-veri-kurallari §1: çakışmada benzersiz indeks yetkilidir, üç kez yeniden denenir. */
export const PUBLIC_ID_INSERT_ATTEMPTS = 3

export type InsertWithPublicIdOptions = {
  /** Önek (`chn_` ya da `chn`). */
  prefix: string
  random?: RandomBytes
  /** Toplam deneme sayısı (varsayılan 3). */
  attempts?: number
}

/**
 * Yalnız `public_id` benzersiz indeksini ihlal eden hatayı yeniden denenebilir sayar; başka bir
 * benzersiz sütun (ör. `channels.code`) çağıranın hatasıdır ve hemen yükselir.
 */
export function isPublicIdCollision(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /UNIQUE/i.test(message) && /public_id/i.test(message)
}

/**
 * Kimliği üretip ifadeyi kurar; çakışmada **yeni kimlikle** yeniden dener (aynı kimlikle denemek
 * aynı hatayı verir). Denemeler tükenirse son hata yükselir.
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
