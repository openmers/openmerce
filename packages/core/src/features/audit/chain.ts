import type { auditLog } from "@openmers/db"

export type AuditRow = typeof auditLog.$inferSelect

/** Kanonik JSON: nesne anahtarları sıralı, dizi sırası korunur, `undefined` alan yok sayılır. */
export function canonicalJson(value: unknown): string {
  if (value === undefined) return "null"
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`)
  return `{${entries.join(",")}}`
}

// Zincire giren alanlar ve sırası; mühürleme işi (features/audit seal) aynı sırayı kullanır.
const CHAIN_FIELDS = [
  "seq",
  "publicId",
  "actorType",
  "actorId",
  "viaAppInstallationId",
  "onBehalfCustomerId",
  "action",
  "entityType",
  "entityPublicId",
  "channelId",
  "before",
  "after",
  "requestId",
  "createdAt",
] as const

/** `SHA-256(prev_hash ‖ kanonik(satır))` girdisi; `prev_hash` yoksa boş dize (zincir başı). */
export function canonicalAuditRow(row: AuditRow): string {
  const picked: Record<string, unknown> = {}
  for (const field of CHAIN_FIELDS) picked[field] = row[field]
  return canonicalJson(picked)
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Zincir özeti: önceki satırın özeti + bu satır, Web Crypto SHA-256 (yalnız Web Crypto).
 * Katalog tasarımı gereği yazma anında değil mühürleme işinde çağrılır; eşzamanlı yazmalar bu
 * yüzden zinciri bozamaz (mühür tek tüketici, `seq` sırası). Mühür işi kapsam dışı.
 */
export async function auditRowHash(prevHash: string | null, row: AuditRow): Promise<string> {
  const input = `${prevHash ?? ""}${canonicalAuditRow(row)}`
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
  return toHex(digest)
}
