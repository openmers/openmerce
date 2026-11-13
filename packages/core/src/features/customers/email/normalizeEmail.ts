import { CustomerError } from "../types"

/**
 * `customers.email_normalized`: trimmed, Unicode NFC, lowercase (locale-independent). One customer row
 * per normalized email (11-musteriler §3). Provider-specific rules (dots, `+tag`) are not applied: they
 * differ per provider and would merge distinct people.
 */
export function normalizeEmail(email: string): string {
  const normalized = email.normalize("NFC").trim().toLowerCase()
  const at = normalized.lastIndexOf("@")
  if (at < 1 || at === normalized.length - 1 || /\s/.test(normalized)) {
    throw new CustomerError("INVALID_INPUT", "invalid email")
  }
  return normalized
}
