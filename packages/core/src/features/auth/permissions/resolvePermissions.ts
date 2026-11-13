import { allPermissions, SUPER_ADMIN_ROLE } from "./registry"

/** One row of the `admin_role_assignments` + `roles.code` + `role_permissions` join. */
export type RoleAssignment = {
  roleCode: string
  /** `null` = all channels, including ones opened later. */
  channelId: number | null
  permissions: readonly string[]
}

/**
 * Pure: the admin's permissions in channel `channelId`. Roles are assigned per channel; an assignment
 * with a `null` channel applies to every channel. `SuperAdmin` gets all registered permissions (no rows written).
 * A permission not in the dictionary (old/removed app) is ignored.
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
