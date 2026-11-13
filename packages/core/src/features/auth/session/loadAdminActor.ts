import { adminRoleAssignments, adminUsers, rolePermissions, roles } from "@openmers/db"
import { eq } from "drizzle-orm"
import type { Platform } from "../../../platform"
import { type RoleAssignment, resolvePermissions } from "../permissions/resolvePermissions"

export type AdminActor = {
  id: number
  publicId: string
  name: string
  email: string
  permissions: Set<string>
}

/**
 * Oturumdaki yöneticiyi ve `channelId` kanalındaki izinlerini yükler. Yönetici yoksa, `active`
 * değilse ya da oturumun `session_version` kopyası güncel değilse `null` (oturum reddedilir).
 */
// shortcut: istek başına iki sorgu; oturum önbelleği (madde 10.7 / 12.5) gelince tek okumaya iner.
export async function loadAdminActor(
  p: Pick<Platform, "db">,
  input: { adminUserId: number; sessionVersion: number; channelId: number },
): Promise<AdminActor | null> {
  const [admin] = await p.db
    .select({
      publicId: adminUsers.publicId,
      name: adminUsers.name,
      email: adminUsers.email,
      status: adminUsers.status,
      sessionVersion: adminUsers.sessionVersion,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, input.adminUserId))
    .limit(1)
  if (admin?.status !== "active" || admin.sessionVersion !== input.sessionVersion) {
    return null
  }

  const rows = await p.db
    .select({
      id: adminRoleAssignments.id,
      roleCode: roles.code,
      channelId: adminRoleAssignments.channelId,
      permission: rolePermissions.permission,
    })
    .from(adminRoleAssignments)
    .innerJoin(roles, eq(roles.id, adminRoleAssignments.roleId))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .where(eq(adminRoleAssignments.adminUserId, input.adminUserId))

  const byAssignment = new Map<number, RoleAssignment & { permissions: string[] }>()
  for (const r of rows) {
    const a = byAssignment.get(r.id) ?? {
      roleCode: r.roleCode,
      channelId: r.channelId,
      permissions: [],
    }
    if (r.permission) a.permissions.push(r.permission)
    byAssignment.set(r.id, a)
  }

  return {
    id: input.adminUserId,
    publicId: admin.publicId,
    name: admin.name,
    email: admin.email,
    permissions: resolvePermissions([...byAssignment.values()], input.channelId),
  }
}
