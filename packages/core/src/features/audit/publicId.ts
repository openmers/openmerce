import { newPublicId } from "../ids/publicId"

/** `aud_` + 10 karakter Crockford base32. Üretim tek kaynaktadır (`features/ids`). */
export function newAuditPublicId(): string {
  return newPublicId("aud_")
}
