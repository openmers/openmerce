import { newPublicId } from "../ids/publicId"

/** `aud_` + 10 characters of Crockford base32. Generation has a single source (`features/ids`). */
export function newAuditPublicId(): string {
  return newPublicId("aud_")
}
