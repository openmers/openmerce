import { allPermissions, SUPER_ADMIN_ROLE } from "./registry"

/** `admin_role_assignments` + `roles.code` + `role_permissions` birleşiminin bir satırı. */
export type RoleAssignment = {
  roleCode: string
  /** `null` = tüm kanallar, sonradan açılanlar dahil. */
  channelId: number | null
  permissions: readonly string[]
}

/**
 * Saf: yöneticinin `channelId` kanalındaki izinleri. Roller kanal başına atanır; `null` kanallı
 * atama her kanalda geçerlidir. `SuperAdmin` kayıtlı bütün izinleri alır (satırı yazılmaz).
 * Sözlükte olmayan izin (eski/kaldırılmış app) yok sayılır.
 */
export function resolvePermissions(
  assignments: readonly RoleAssignment[],
  channelId: number,
  known: ReadonlySet<string> = allPermissions(),
): Set<string> {
  const out = new Set<string>()
  for (const a of assignments) {
    if (a.channelId !== null && a.channelId !== channelId) continue
    if (a.roleCode === SUPER_ADMIN_ROLE) return new Set(known)
    for (const p of a.permissions) if (known.has(p)) out.add(p)
  }
  return out
}
