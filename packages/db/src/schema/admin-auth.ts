import { sql } from "drizzle-orm"
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { publicId } from "./columns"

// 01-cekirdek-isletme.md B: Better Auth yönetici örneği (user, session, account, verification,
// twoFactor, passkey). Better Auth 1.7.23 doğrulandı: generateId "serial" ile tamsayı id; model ve
// alan adları modelName/fields ile eşlenir. Better Auth tarih alanlarına Date yazar (drizzle
// adaptörü supportsDates), bu yüzden bu tablolarda zaman sütunları timestamp_ms: SQL'de yine
// integer UTC epoch ms, columns.ts ile aynı depolama.
const ts = (name: string) => integer(name, { mode: "timestamp_ms" })
const baCreatedAt = () => ts("created_at").notNull()
const baUpdatedAt = () => ts("updated_at").notNull()

export const adminUserStatuses = ["invited", "active", "suspended"] as const

export const adminUsers = sqliteTable(
  "admin_users",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    image: text("image"),
    twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" }).notNull().default(false),
    sessionVersion: integer("session_version").notNull().default(0),
    status: text("status", { enum: adminUserStatuses }).notNull(),
    createdAt: baCreatedAt(),
    updatedAt: baUpdatedAt(),
  },
  (t) => [
    uniqueIndex("admin_users_public_id_uq").on(t.publicId),
    uniqueIndex("admin_users_email_uq").on(t.email),
    check("admin_users_status_ck", sql`${t.status} IN ('invited', 'active', 'suspended')`),
  ],
)

// Better Auth referansları onDelete cascade üretir; yönetici satırı silinmez (suspended) ama
// kurtarma/temizlikte alt satırlar artık kalmaz.
const adminUserId = () =>
  integer("admin_user_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" })

export const adminSessions = sqliteTable(
  "admin_sessions",
  {
    id: integer("id").primaryKey(),
    adminUserId: adminUserId(),
    // Better Auth 1.7.23'te session.token için özet seçeneği yok: düz saklanır (karar 13)
    token: text("token").notNull(),
    expiresAt: ts("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    sessionVersion: integer("session_version").notNull(),
    permissions: text("permissions", { mode: "json" }).$type<Record<string, string[]>>().notNull(),
    policySql: text("policy_sql"),
    reauthAt: integer("reauth_at"),
    createdAt: baCreatedAt(),
    updatedAt: baUpdatedAt(),
  },
  (t) => [
    uniqueIndex("admin_sessions_token_uq").on(t.token),
    index("admin_sessions_admin_user_idx").on(t.adminUserId),
    index("admin_sessions_expires_idx").on(t.expiresAt),
    check("admin_sessions_permissions_ck", sql`json_type(${t.permissions}) = 'object'`),
  ],
)

export const adminAccounts = sqliteTable(
  "admin_accounts",
  {
    id: integer("id").primaryKey(),
    adminUserId: adminUserId(),
    providerId: text("provider_id").notNull(),
    accountId: text("account_id").notNull(),
    password: text("password"),
    // OAuth alanları yönetici tarafında boş; Better Auth şeması gerektirir
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: ts("access_token_expires_at"),
    refreshTokenExpiresAt: ts("refresh_token_expires_at"),
    scope: text("scope"),
    createdAt: baCreatedAt(),
    updatedAt: baUpdatedAt(),
  },
  (t) => [
    uniqueIndex("admin_accounts_provider_account_uq").on(t.providerId, t.accountId),
    index("admin_accounts_admin_user_idx").on(t.adminUserId),
  ],
)

export const adminVerifications = sqliteTable(
  "admin_verifications",
  {
    id: integer("id").primaryKey(),
    // verification.storeIdentifier "hashed" ile özet; value için seçenek yok
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: ts("expires_at").notNull(),
    createdAt: baCreatedAt(),
    updatedAt: baUpdatedAt(),
  },
  (t) => [
    index("admin_verifications_identifier_idx").on(t.identifier),
    index("admin_verifications_expires_idx").on(t.expiresAt),
  ],
)

// twoFactor eklentisi 1.7.23: created_at/updated_at yazmaz (NOT NULL olsa ekleme kırılır, sütun
// yok); verified, failed_verification_count, locked_until ister. backupCodes "encrypted" seçilebilir.
export const adminTwoFactors = sqliteTable(
  "admin_two_factors",
  {
    id: integer("id").primaryKey(),
    adminUserId: adminUserId(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    verified: integer("verified", { mode: "boolean" }).notNull().default(true),
    failedVerificationCount: integer("failed_verification_count").notNull().default(0),
    lockedUntil: ts("locked_until"),
  },
  (t) => [uniqueIndex("admin_two_factors_admin_user_uq").on(t.adminUserId)],
)

// @better-auth/passkey 1.7.23 alanları; credentialID → credential_id fields eşlemesiyle
export const adminPasskeys = sqliteTable(
  "admin_passkeys",
  {
    id: integer("id").primaryKey(),
    adminUserId: adminUserId(),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    credentialId: text("credential_id").notNull(),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: integer("backed_up", { mode: "boolean" }).notNull(),
    transports: text("transports"),
    aaguid: text("aaguid"),
    createdAt: baCreatedAt(),
  },
  (t) => [
    uniqueIndex("admin_passkeys_credential_uq").on(t.credentialId),
    index("admin_passkeys_admin_user_idx").on(t.adminUserId),
  ],
)
