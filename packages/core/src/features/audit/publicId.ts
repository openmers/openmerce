// shortcut: `features/ids/publicId` (madde 6.6) yazılmadı; denetim satırı kendi kimliğini üretir.
// Rastgelelik `Crypto.getRandomValues`'tan gelir; ids gelince tek kaynağa taşınır.
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

/** `aud_` + 10 karakter Crockford base32 (50 bit). */
export function newAuditPublicId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  let out = "aud_"
  for (const byte of bytes) out += CROCKFORD[byte % 32]
  return out
}
