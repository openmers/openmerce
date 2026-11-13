import { canonicalJson } from "./normalize"
import type { PersonalizationValue } from "./schema"

/**
 * `line_key` (05-sepet §1.1): first 16 bytes of SHA-256 over the canonical `personalization`
 * JSON, 32 lowercase hex. `""` for a line without personalization. Web Crypto: same on Workers
 * and Node.
 */
export async function lineKey(value: PersonalizationValue | null): Promise<string> {
  if (!value || Object.keys(value).length === 0) return ""
  const bytes = new TextEncoder().encode(canonicalJson(value))
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
  return [...digest.subarray(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("")
}
