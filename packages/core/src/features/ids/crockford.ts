// Crockford base32 (catalog 01 "Shared rules"): 10 characters = 50 bits. No I, L, O, U in the alphabet
// (confusable letters removed); comparison is done in uppercase.
export const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

/** Length of the `public_id` body (03-veri-kurallari §1: prefix + 10 characters). */
export const PUBLIC_ID_BODY_LENGTH = 10

/**
 * The low 5 bits of each byte map to one character. Since 256 = 8 × 32, `% 32` is unbiased.
 * If `length` is given, bytes are reused in a loop (for buffers shorter than 10 bytes).
 */
export function encodeCrockford(bytes: Uint8Array, length = PUBLIC_ID_BODY_LENGTH): string {
  if (bytes.length === 0) throw new RangeError("Crockford kodlaması için bayt gerekli")
  let out = ""
  for (let i = 0; i < length; i += 1) {
    const byte = bytes[i % bytes.length] as number
    out += CROCKFORD_ALPHABET[byte % 32]
  }
  return out
}

/** Body format: 10 characters, Crockford alphabet only, uppercase. */
export function isCrockfordBody(value: string): boolean {
  if (value.length !== PUBLIC_ID_BODY_LENGTH) return false
  for (const char of value) if (!CROCKFORD_ALPHABET.includes(char)) return false
  return true
}
