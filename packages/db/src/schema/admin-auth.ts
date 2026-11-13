import { sql } from "drizzle-orm"
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { publicId } from "./columns"

// 01-cekirdek-isletme.md B: Better Auth admin instance (user, session, account, verification,
// twoFactor, passkey). Better Auth 1.7.23 verified: generateId "serial" gives integer ids; model and
// field names map via modelName/fields. Better Auth writes Date into date fields (the drizzle
// adapter supportsDates), so time columns here are timestamp_ms: still integer UTC epoch ms in SQL,
// same storage as columns.ts.
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

// Better Auth references generate onDelete cascade; the admin row is never deleted (suspended) but
// recovery/cleanup no longer leaves child rows behind.
const adminUserId = () =>
  integer("admin_user_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" })

export const adminSessions = sqliteTable(
  "admin_sessions",
  {
    id: integer("id").primaryKey(),
    adminUserId: adminUserId(),
    // Better Auth 1.7.23 has no hash option for session.token; the adapter wrapper writes only
    // the SHA-256 digest (apps/api/src/auth/hashedSessions.ts, decision 13)
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
    // OAuth fields are empty on the admin side; the Better Auth schema requires them
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
    // verification.storeIdentifier "hashed" stores a digest; no option for value
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

// twoFactor plugin 1.7.23: writes no created_at/updated_at (insert breaks if NOT NULL, column
// absent); wants verified, failed_verification_count, locked_until. backupCodes can be "encrypted".
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

// @better-auth/passkey 1.7.23 fields; credentialID → credential_id via fields mapping
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
