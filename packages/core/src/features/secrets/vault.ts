import { type secretScopes, secrets } from "@openmers/db"
import { and, eq } from "drizzle-orm"
import type { Platform } from "../../platform"
import { type AuditActor, auditStatement } from "../audit"
import { decryptSecret, encryptSecret, type SecretAddress } from "./crypto"
import { isDemoMode, requireKek, SecretError } from "./demoMode"

export type SecretScope = (typeof secretScopes)[number]
export type SecretRef = SecretAddress & { scope: SecretScope }

type Blob = typeof secrets.$inferInsert.ciphertext
// Drivers (better-sqlite3, D1) bind Uint8Array as a blob; the Drizzle type says Node `Buffer`.
const asBlob = (u: Uint8Array) => u as unknown as Blob
// On read, a Buffer (Node) / ArrayBuffer or a number array (D1) may come back.
const toBytes = (v: unknown) => new Uint8Array(v as ArrayLike<number>)

const where = (ref: SecretRef) =>
  and(eq(secrets.scope, ref.scope), eq(secrets.scopeId, ref.scopeId), eq(secrets.key, ref.key))

/**
 * Encrypts and writes the secret: upsert + audit row in one `atomic()`. No value in the audit, only the address.
 * `VAULT_ASLEEP` without a KEK. The value is never returned.
 */
export async function setSecret(
  p: Pick<Platform, "db" | "atomic" | "secrets">,
  ref: SecretRef,
  value: string,
  now: number,
  actor: AuditActor,
): Promise<void> {
  const kek = requireKek(p)
  if (ref.key.trim() === "") throw new SecretError("INVALID_SECRET", "sır anahtarı boş")
  if (value === "") throw new SecretError("INVALID_SECRET", "sır değeri boş")
  const sealed = await encryptSecret(kek, ref, value)
  const row = {
    ciphertext: asBlob(sealed.ciphertext),
    iv: asBlob(sealed.iv),
    kekVersion: sealed.kekVersion,
    updatedByAdminId: actor.type === "admin" ? (actor.id ?? null) : null,
    updatedAt: now,
  }
  const upsert = p.db
    .insert(secrets)
    .values({ scope: ref.scope, scopeId: ref.scopeId, key: ref.key, ...row, createdAt: now })
    .onConflictDoUpdate({ target: [secrets.scope, secrets.scopeId, secrets.key], set: row })
    .toSQL()
  const audit = auditStatement(
    p.db,
    {
      actor,
      action: "secrets:write",
      entityType: "secret",
      entityPublicId: `${ref.scope}:${ref.scopeId}:${ref.key}`,
      channelId: ref.scope === "channel" ? ref.scopeId : undefined,
      after: { scope: ref.scope, scopeId: ref.scopeId, key: ref.key, value: "***" },
    },
    now,
  )
  await p.atomic([upsert, audit])
}

/** Whether the secret is set (the "set" indicator in the UI). `false` if the vault is dormant: the secret cannot be used. */
export async function hasSecret(p: Pick<Platform, "db" | "secrets">, ref: SecretRef) {
  if (isDemoMode(p)) return false
  const rows = await p.db.select({ id: secrets.id }).from(secrets).where(where(ref)).limit(1)
  return rows.length > 0
}

/**
 * Server-side only: the decrypted value is only passed to the `use` callback (no read endpoint). The caller
 * never puts the value in a response, log or audit row.
 */
export async function useSecret<T>(
  p: Pick<Platform, "db" | "secrets">,
  ref: SecretRef,
  use: (value: string) => T | Promise<T>,
): Promise<T> {
  const kek = requireKek(p)
  const [row] = await p.db
    .select({ ciphertext: secrets.ciphertext, iv: secrets.iv, kekVersion: secrets.kekVersion })
    .from(secrets)
    .where(where(ref))
    .limit(1)
  if (!row) throw new SecretError("SECRET_NOT_FOUND", `sır yok: ${ref.scope}:${ref.key}`)
  const value = await decryptSecret(kek, ref, {
    ciphertext: toBytes(row.ciphertext),
    iv: toBytes(row.iv),
    kekVersion: row.kekVersion,
  })
  return await use(value)
}
