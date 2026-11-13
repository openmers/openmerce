import { isPublicIdPrefix, type PublicIdPrefix } from "@openmers/db"
import { encodeCrockford, isCrockfordBody, PUBLIC_ID_BODY_LENGTH } from "./crockford"

/**
 * Rastgelelik enjekte edilebilir: varsayılan Web Crypto'dur (`crypto.getRandomValues`), testte
 * çakışma zorlamak için sahte üreteç verilir (yol haritası 6.6). `length` bayt döner.
 */
export type RandomBytes = (length: number) => Uint8Array

export const webCryptoRandomBytes: RandomBytes = (length) =>
  crypto.getRandomValues(new Uint8Array(length))

/** Önek biçimi: 2-6 küçük harf/rakam + `_` (ör. `chn_`, `prod_`, `cmb_`). */
const PREFIX_SHAPE = /^[a-z][a-z0-9]{1,5}_$/

/** `chn` / `chn_` → `chn_`; geçersizse hata. */
export function normalizePrefix(prefix: string): PublicIdPrefix {
  const withUnderscore = prefix.endsWith("_") ? prefix : `${prefix}_`
  if (!PREFIX_SHAPE.test(withUnderscore)) throw new RangeError(`geçersiz önek: ${prefix}`)
  if (!isPublicIdPrefix(withUnderscore)) throw new RangeError(`önek haritada yok: ${prefix}`)
  return withUnderscore
}

/** `prefix` + 10 karakter Crockford base32 (50 rastgele bit). Önek haritada olmalı. */
export function newPublicId(prefix: string, random: RandomBytes = webCryptoRandomBytes): string {
  const normalized = normalizePrefix(prefix)
  const bytes = random(PUBLIC_ID_BODY_LENGTH)
  return normalized + encodeCrockford(bytes)
}

export type ParsedPublicId = { prefix: PublicIdPrefix; body: string }

/**
 * Sınırda girdi doğrulaması: önek haritada mı, gövde 10 karakter Crockford (büyük harf) mı.
 * Küçük harfli gövde reddedilir: kimlikler kanonik biçimde karşılaştırılır.
 */
export function parsePublicId(value: string): ParsedPublicId | null {
  const underscore = value.indexOf("_")
  if (underscore < 1) return null
  const prefix = value.slice(0, underscore + 1)
  const body = value.slice(underscore + 1)
  if (!isPublicIdPrefix(prefix)) return null
  if (!isCrockfordBody(body)) return null
  return { prefix, body }
}

/**
 * `value` geçerli bir `public_id` mi? `prefix` verilirse önek de eşleşmeli (yanlış önek reddi);
 * `prefix` `chn` ya da `chn_` yazılabilir.
 */
export function isPublicId(value: unknown, prefix?: string): boolean {
  if (typeof value !== "string") return false
  const parsed = parsePublicId(value)
  if (!parsed) return false
  if (prefix === undefined) return true
  const expected = prefix.endsWith("_") ? prefix : `${prefix}_`
  return parsed.prefix === expected
}
