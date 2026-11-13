import { sql } from "drizzle-orm"
import {
  blob,
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"
import { adminUsers } from "./admin-auth"
import { channels } from "./channels"
import { createdAt, publicId, updatedAt } from "./columns"

// 01-cekirdek-isletme.md D (machine identities, secrets, idempotency) and F (audit). Tokens are
// stored only as a SHA-256 hex digest (08-kimlik-dogrulama section 6).

export const secretScopes = ["global", "channel", "built_in_app", "app_installation"] as const

export const secrets = sqliteTable(
  "secrets",
  {
    id: integer("id").primaryKey(),
    scope: text("scope", { enum: secretScopes }).notNull(),
    // same rule as settings: global and built_in_app = 0; no FK (polymorphic)
    scopeId: integer("scope_id").notNull().default(0),
    key: text("key").notNull(),
    ciphertext: blob("ciphertext", { mode: "buffer" }).notNull(),
    iv: blob("iv", { mode: "buffer" }).notNull(),
    kekVersion: integer("kek_version").notNull(),
    updatedByAdminId: integer("updated_by_admin_id").references(() => adminUsers.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("secrets_scope_key_uq").on(t.scope, t.scopeId, t.key),
    check(
      "secrets_scope_ck",
      sql`${t.scope} IN ('global', 'channel', 'built_in_app', 'app_installation')`,
    ),
    check(
      "secrets_scope_id_ck",
      sql`(${t.scope} IN ('global', 'built_in_app')) = (${t.scopeId} = 0)`,
    ),
    // AES-256-GCM IV 12 bytes
    check("secrets_iv_ck", sql`length(${t.iv}) = 12`),
  ],
)

export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    permissions: text("permissions", { mode: "json" }).$type<string[]>().notNull(),
    // NULL = all channels
    channelIds: text("channel_ids", { mode: "json" }).$type<number[]>(),
    createdByAdminId: integer("created_by_admin_id")
      .notNull()
      .references(() => adminUsers.id),
    lastUsedAt: integer("last_used_at"),
    revokedAt: integer("revoked_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("api_keys_public_id_uq").on(t.publicId),
    uniqueIndex("api_keys_key_hash_uq").on(t.keyHash),
    check("api_keys_permissions_ck", sql`json_type(${t.permissions}) = 'array'`),
    check("api_keys_channel_ids_ck", sql`json_type(${t.channelIds}) = 'array'`),
  ],
)

export const channelPublishableKeys = sqliteTable(
  "channel_publishable_keys",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    name: text("name"),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    lastUsedAt: integer("last_used_at"),
    revokedAt: integer("revoked_at"),
    // end of the old key's grace on rotation; NULL = no expiry
    expiresAt: integer("expires_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("channel_publishable_keys_public_id_uq").on(t.publicId),
    uniqueIndex("channel_publishable_keys_key_hash_uq").on(t.keyHash),
    index("channel_publishable_keys_channel_idx").on(t.channelId),
  ],
)

export const idempotencyActorTypes = ["customer", "admin", "app", "apiKey", "anonymous"] as const

export const idempotencyKeys = sqliteTable(
  "idempotency_keys",
  {
    id: integer("id").primaryKey(),
    actorType: text("actor_type", { enum: idempotencyActorTypes }).notNull(),
    // 0 for anonymous; no FK (polymorphic)
    actorId: integer("actor_id").notNull().default(0),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text("status", { enum: ["in_progress", "done"] }).notNull(),
    responseStatus: integer("response_status"),
    response: text("response", { mode: "json" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("idempotency_keys_actor_key_uq").on(t.actorType, t.actorId, t.key),
    index("idempotency_keys_expires_idx").on(t.expiresAt),
    check(
      "idempotency_keys_actor_type_ck",
      sql`${t.actorType} IN ('customer', 'admin', 'app', 'apiKey', 'anonymous')`,
    ),
    check("idempotency_keys_status_ck", sql`${t.status} IN ('in_progress', 'done')`),
  ],
)

// audit_log rows are immutable; prev_hash/row_hash are written once at sealing, no updated_at.
// Actor columns are polymorphic: no FK.
export const auditActorTypes = ["admin", "app", "apiKey", "agent", "system"] as const

export const auditLog = sqliteTable(
  "audit_log",
  {
    // INTEGER PRIMARY KEY = rowid; sealing order
    seq: integer("seq").primaryKey(),
    publicId: publicId(),
    actorType: text("actor_type", { enum: auditActorTypes }).notNull(),
    actorId: integer("actor_id"),
    viaAppInstallationId: integer("via_app_installation_id"),
    onBehalfCustomerId: integer("on_behalf_customer_id"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityPublicId: text("entity_public_id"),
    channelId: integer("channel_id"),
    before: text("before", { mode: "json" }),
    after: text("after", { mode: "json" }),
    requestId: text("request_id"),
    createdAt: createdAt(),
    prevHash: text("prev_hash"),
    // SHA-256(prev_hash ‖ canonical(row)); NULL = unsealed
    rowHash: text("row_hash"),
  },
  (t) => [
    uniqueIndex("audit_log_public_id_uq").on(t.publicId),
    index("audit_log_unsealed_idx").on(t.seq).where(sql`${t.rowHash} IS NULL`),
    index("audit_log_entity_idx").on(t.entityType, t.entityPublicId, t.createdAt),
    index("audit_log_actor_idx").on(t.actorType, t.actorId, t.createdAt),
    index("audit_log_action_idx").on(t.action, t.createdAt),
    index("audit_log_created_idx").on(t.createdAt),
    check(
      "audit_log_actor_type_ck",
      sql`${t.actorType} IN ('admin', 'app', 'apiKey', 'agent', 'system')`,
    ),
  ],
)

export const auditAnchors = sqliteTable(
  "audit_anchors",
  {
    id: integer("id").primaryKey(),
    // UTC day start, epoch ms
    day: integer("day").notNull(),
    lastSeq: integer("last_seq").notNull(),
    lastHash: text("last_hash").notNull(),
    // HMAC with a key derived from the KEK
    signature: text("signature").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("audit_anchors_day_uq").on(t.day)],
)
