import { isPublicIdPrefix, type PublicIdPrefix } from "@openmers/db"
import { encodeCrockford, isCrockfordBody, PUBLIC_ID_BODY_LENGTH } from "./crockford"

/**
 * Randomness can be injected: the default is Web Crypto (`crypto.getRandomValues`); tests pass a fake
 * generator to force collisions (roadmap 6.6). Returns `length` bytes.
 */
export type RandomBytes = (length: number) => Uint8Array

export const webCryptoRandomBytes: RandomBytes = (length) =>
  crypto.getRandomValues(new Uint8Array(length))

/** Prefix format: 2-6 lowercase letters/digits + `_` (e.g. `chn_`, `prod_`, `cmb_`). */
const PREFIX_SHAPE = /^[a-z][a-z0-9]{1,5}_$/

/** `chn` / `chn_` → `chn_`; throws if invalid. */
export function normalizePrefix(prefix: string): PublicIdPrefix {
  const withUnderscore = prefix.endsWith("_") ? prefix : `${prefix}_`
  if (!PREFIX_SHAPE.test(withUnderscore)) throw new RangeError(`geçersiz önek: ${prefix}`)
  if (!isPublicIdPrefix(withUnderscore)) throw new RangeError(`önek haritada yok: ${prefix}`)
  return withUnderscore
}

/** `prefix` + 10 characters of Crockford base32 (50 random bits). The prefix must be in the map. */
export function newPublicId(prefix: string, random: RandomBytes = webCryptoRandomBytes): string {
  const normalized = normalizePrefix(prefix)
  const bytes = random(PUBLIC_ID_BODY_LENGTH)
  return normalized + encodeCrockford(bytes)
}

export type ParsedPublicId = { prefix: PublicIdPrefix; body: string }

/**
 * Input validation at the boundary: is the prefix in the map, is the body 10 Crockford characters (uppercase).
 * A lowercase body is rejected: ids are compared in canonical form.
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
 * Is `value` a valid `public_id`? If `prefix` is given the prefix must match too (wrong prefix rejected);
 * `prefix` can be written as `chn` or `chn_`.
 */
export function isPublicId(value: unknown, prefix?: string): boolean {
  if (typeof value !== "string") return false
  const parsed = parsePublicId(value)
  if (!parsed) return false
  if (prefix === undefined) return true
  const expected = prefix.endsWith("_") ? prefix : `${prefix}_`
  return parsed.prefix === expected
}
