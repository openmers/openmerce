import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"
import { adminUsers } from "./admin-auth"
import { channels } from "./channels"
import { createdAt, publicId, updatedAt } from "./columns"

// 01-cekirdek-isletme.md B: role, permission, per-channel assignment (decision 1), record-level policy.
// Part of migration 0003; separate file so admin-auth.ts stays under 250 lines.
export const roles = sqliteTable(
  "roles",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("roles_public_id_uq").on(t.publicId),
    uniqueIndex("roles_code_uq").on(t.code),
  ],
)

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    // <entity>:<action>; dictionary in code
    permission: text("permission").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ name: "role_permissions_pk", columns: [t.roleId, t.permission] })],
)

export const adminRoleAssignments = sqliteTable(
  "admin_role_assignments",
  {
    id: integer("id").primaryKey(),
    adminUserId: integer("admin_user_id")
      .notNull()
      .references(() => adminUsers.id),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id),
    // NULL = all channels, including ones opened later
    channelId: integer("channel_id").references(() => channels.id),
    createdAt: createdAt(),
  },
  (t) => [
    // prevents NULL duplicates (NULLs are not equal in a unique index)
    uniqueIndex("admin_role_assignments_uq").on(
      t.adminUserId,
      t.roleId,
      sql`coalesce(${t.channelId}, 0)`,
    ),
    index("admin_role_assignments_role_idx").on(t.roleId),
  ],
)

export const policyResources = ["orders", "customers", "products", "companies", "quotes"] as const

export const accessPolicies = sqliteTable(
  "access_policies",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    name: text("name").notNull(),
    roleId: integer("role_id").references(() => roles.id),
    adminId: integer("admin_id").references(() => adminUsers.id),
    resource: text("resource", { enum: policyResources }).notNull(),
    condition: text("condition", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    active: integer("active", { mode: "boolean" }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("access_policies_public_id_uq").on(t.publicId),
    index("access_policies_role_idx").on(t.roleId),
    index("access_policies_admin_idx").on(t.adminId),
    check("access_policies_target_ck", sql`(${t.roleId} IS NULL) <> (${t.adminId} IS NULL)`),
    check(
      "access_policies_resource_ck",
      sql`${t.resource} IN ('orders', 'customers', 'products', 'companies', 'quotes')`,
    ),
    check("access_policies_condition_ck", sql`json_type(${t.condition}) = 'object'`),
  ],
)
