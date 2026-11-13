import type { auditLog } from "@openmers/db"

export type AuditRow = typeof auditLog.$inferSelect

/** Canonical JSON: object keys sorted, array order kept, `undefined` fields ignored. */
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

// Fields in the chain and their order; the sealing job (features/audit seal) uses the same order.
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

/** Input of `SHA-256(prev_hash ‖ canonical(row))`; empty string if there is no `prev_hash` (chain head). */
export function canonicalAuditRow(row: AuditRow): string {
  const picked: Record<string, unknown> = {}
  for (const field of CHAIN_FIELDS) picked[field] = row[field]
  return canonicalJson(picked)
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Chain hash: the previous row's hash + this row, Web Crypto SHA-256 (Web Crypto only).
 * By catalog design it is called in the sealing job, not at write time; so concurrent writes
 * cannot break the chain (the seal has a single consumer, `seq` order). The sealing job is out of scope.
 */
export async function auditRowHash(prevHash: string | null, row: AuditRow): Promise<string> {
  const input = `${prevHash ?? ""}${canonicalAuditRow(row)}`
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
  return toHex(digest)
}
