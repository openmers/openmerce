import {
  adminAccounts,
  adminRoleAssignments,
  adminUsers,
  PUBLIC_ID_PREFIXES,
  roles,
  settings,
} from "@openmers/db"
import { sql } from "drizzle-orm"
import type { Platform } from "../../../platform"
import { auditStatement } from "../../audit"
import { insertWithPublicId, newPublicId } from "../../ids"
import { SETUP_COMPLETED_KEY } from "../../settings/registry"
import { SUPER_ADMIN_ROLE } from "../permissions/registry"
import { getSetupCompletedAt } from "./getSetupCompletedAt"

export type CreateFirstAdminInput = {
  name: string
  email: string
  /** Better Auth parola özeti (`better-auth/crypto` `hashPassword`); core özet hesaplamaz. */
  passwordHash: string
  requestId?: string
}

export type CreateFirstAdminResult =
  | { ok: true; adminId: string }
  | { ok: false; code: "SETUP_DONE" }

/** Kurulum kilidi satırının benzersiz indeksi ihlal edildi mi (yarışı kaybeden çağrı). */
function isSetupConflict(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /UNIQUE/i.test(message) && /settings\./i.test(message)
}

/**
 * Kurulum sihirbazının ilk yöneticisi (`08-kimlik-dogrulama` §4, katalog `settings`): tek
 * `atomic()`'te kurulum kilidi + `SuperAdmin` rolü + yönetici + parola hesabı + rol ataması +
 * denetim. Kilit ilk ifadedir ve `ON CONFLICT` almaz: ikinci (ya da yarışı kaybeden) çağrıda
 * benzersiz indeks bütün partiyi geri alır, sonuç `SETUP_DONE` olur (tam bir kazanan).
 */
export async function createFirstAdmin(
  p: Pick<Platform, "db" | "atomic">,
  input: CreateFirstAdminInput,
  now: number,
): Promise<CreateFirstAdminResult> {
  if ((await getSetupCompletedAt(p)) !== null) return { ok: false, code: "SETUP_DONE" }
  // Better Auth girişte e-postayı küçültüp arar.
  const email = input.email.trim().toLowerCase()
  const adminIdSql = sql`(SELECT ${adminUsers.id} FROM ${adminUsers} WHERE ${adminUsers.email} = ${email})`
  const roleIdSql = sql`(SELECT ${roles.id} FROM ${roles} WHERE ${roles.code} = ${SUPER_ADMIN_ROLE})`

  const build = (adminId: string) => [
    p.db
      .insert(settings)
      .values({
        scope: "global",
        scopeId: 0,
        key: SETUP_COMPLETED_KEY,
        value: now,
        createdAt: now,
        updatedAt: now,
      })
      .toSQL(),
    p.db
      .insert(roles)
      .values({
        publicId: newPublicId(PUBLIC_ID_PREFIXES.roles),
        code: SUPER_ADMIN_ROLE,
        name: SUPER_ADMIN_ROLE,
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: roles.code })
      .toSQL(),
    p.db
      .insert(adminUsers)
      .values({
        publicId: adminId,
        name: input.name,
        email,
        emailVerified: true,
        status: "active",
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })
      .toSQL(),
    // Better Auth credential hesabı: providerId `credential`, accountId = kullanıcı kimliği (metin).
    p.db
      .insert(adminAccounts)
      .values({
        adminUserId: adminIdSql,
        providerId: "credential",
        accountId: sql`CAST(${adminIdSql} AS TEXT)`,
        password: input.passwordHash,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })
      .toSQL(),
    p.db
      .insert(adminRoleAssignments)
      .values({ adminUserId: adminIdSql, roleId: roleIdSql, channelId: null, createdAt: now })
      .toSQL(),
    auditStatement(
      p.db,
      {
        actor: { type: "system" },
        action: "admins:setup",
        entityType: "admin_user",
        entityPublicId: adminId,
        requestId: input.requestId,
      },
      now,
    ),
  ]

  try {
    const adminId = await insertWithPublicId(p, build, { prefix: PUBLIC_ID_PREFIXES.admin_users })
    return { ok: true, adminId }
  } catch (error) {
    if (isSetupConflict(error)) return { ok: false, code: "SETUP_DONE" }
    throw error
  }
}
