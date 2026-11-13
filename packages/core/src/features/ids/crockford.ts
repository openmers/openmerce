// Crockford base32 (katalog 01 "Ortak kurallar"): 10 karakter = 50 bit. Alfabede I, L, O, U yok
// (karışan harfler çıkarıldı); karşılaştırma büyük harfle yapılır.
export const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

/** `public_id` gövdesinin uzunluğu (03-veri-kurallari §1: önek + 10 karakter). */
export const PUBLIC_ID_BODY_LENGTH = 10

/**
 * Her baytın alt 5 biti bir karaktere döner. 256 = 8 × 32 olduğu için `% 32` yanlı değildir.
 * `length` verilirse baytlar döngüyle yeniden kullanılır (10 bayttan kısa tampon için).
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

/** Gövde biçimi: 10 karakter, yalnız Crockford alfabesi, büyük harf. */
export function isCrockfordBody(value: string): boolean {
  if (value.length !== PUBLIC_ID_BODY_LENGTH) return false
  for (const char of value) if (!CROCKFORD_ALPHABET.includes(char)) return false
  return true
}
