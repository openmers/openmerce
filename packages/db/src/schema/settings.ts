import { sql } from "drizzle-orm"
import { check, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { createdAt, updatedAt } from "./columns"

export const settingScopes = [
  "global",
  "channel",
  "admin_user",
  "customer",
  "built_in_app",
] as const

// 01-cekirdek-isletme.md `settings`, 04-asama-1-db-plani §3.1. scope_id: global and built_in_app = 0
// (01 decision; app identity in the key prefix), others a real id. No NULL (would break uniqueness).
export const settings = sqliteTable(
  "settings",
  {
    id: integer("id").primaryKey(),
    scope: text("scope", { enum: settingScopes }).notNull(),
    scopeId: integer("scope_id").notNull().default(0),
    key: text("key").notNull(),
    value: text("value", { mode: "json" }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("settings_scope_key_uq").on(t.scope, t.scopeId, t.key),
    check(
      "settings_scope_ck",
      sql`${t.scope} IN ('global', 'channel', 'admin_user', 'customer', 'built_in_app')`,
    ),
    check(
      "settings_scope_id_ck",
      sql`(${t.scope} IN ('global', 'built_in_app')) = (${t.scopeId} = 0)`,
    ),
    check("settings_key_ck", sql`length(${t.key}) > 0`),
  ],
)
