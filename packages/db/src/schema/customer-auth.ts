import { sql } from "drizzle-orm"
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { customers } from "./customers"

// 01-cekirdek-isletme.md C: Better Auth müşteri örneği (karar 13), 0011. Kalıp admin-auth.ts ile
// aynı: generateId "serial" tamsayı id, tarih alanları timestamp_ms (SQL'de integer epoch ms).
const ts = (name: string) => integer(name, { mode: "timestamp_ms" })
const baCreatedAt = () => ts("created_at").notNull()
const baUpdatedAt = () => ts("updated_at").notNull()

export const companyRoles = ["admin", "buyer", "approver"] as const

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    image: text("image"),
    // phoneNumber eklentisi
    phoneNumber: text("phone_number"),
    phoneNumberVerified: integer("phone_number_verified", { mode: "boolean" }),
    twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" }).notNull().default(false),
    sessionVersion: integer("session_version").notNull().default(0),
    createdAt: baCreatedAt(),
    updatedAt: baUpdatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(t.email),
    uniqueIndex("users_phone_number_uq").on(t.phoneNumber).where(sql`${t.phoneNumber} IS NOT NULL`),
  ],
)

// kişisel veri silmede users satırıyla kimlik satırları gider (01 `users` kuralı)
const userId = () =>
  integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey(),
    userId: userId(),
    // yalnız SHA-256 özeti yazılır (karar 13, yönetici örneğiyle aynı sarmalayıcı)
    token: text("token").notNull(),
    expiresAt: ts("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    groupIds: text("group_ids", { mode: "json" }).$type<number[]>().notNull(),
    // companies 0022'de: FK'sız
    activeCompanyId: integer("active_company_id"),
    companyRole: text("company_role", { enum: companyRoles }),
    // öncelik sırasıyla
    priceListIds: text("price_list_ids", { mode: "json" }).$type<number[]>().notNull(),
    // açılıştaki users.session_version kopyası; uyuşmazsa red
    sessionVersion: integer("session_version").notNull(),
    // satırın iyimser kilit sayacı (etkin şirket değişimi)
    version: integer("version").notNull().default(0),
    createdAt: baCreatedAt(),
    updatedAt: baUpdatedAt(),
  },
  (t) => [
    uniqueIndex("sessions_token_uq").on(t.token),
    index("sessions_user_idx").on(t.userId),
    index("sessions_expires_idx").on(t.expiresAt),
    check("sessions_group_ids_ck", sql`json_type(${t.groupIds}) = 'array'`),
    check("sessions_price_list_ids_ck", sql`json_type(${t.priceListIds}) = 'array'`),
    check("sessions_company_role_ck", sql`${t.companyRole} IN ('admin', 'buyer', 'approver')`),
  ],
)

export const accounts = sqliteTable(
  "accounts",
  {
    id: integer("id").primaryKey(),
    userId: userId(),
    // credential · google · apple
    providerId: text("provider_id").notNull(),
    accountId: text("account_id").notNull(),
    password: text("password"),
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
    uniqueIndex("accounts_provider_account_uq").on(t.providerId, t.accountId),
    index("accounts_user_idx").on(t.userId),
  ],
)

// tek kullanım: DELETE ... WHERE identifier = ? AND value = ? AND expires_at > ?
export const authVerifications = sqliteTable(
  "auth_verifications",
  {
    id: integer("id").primaryKey(),
    // `<amaç>:<hedef>`
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: ts("expires_at").notNull(),
    createdAt: baCreatedAt(),
    updatedAt: baUpdatedAt(),
  },
  (t) => [
    index("auth_verifications_identifier_idx").on(t.identifier),
    index("auth_verifications_expires_idx").on(t.expiresAt),
  ],
)

// twoFactor eklentisi 1.7.23 created_at/updated_at yazmaz (karar 13; 01 katalog satırından sapma)
export const twoFactors = sqliteTable(
  "two_factors",
  {
    id: integer("id").primaryKey(),
    userId: userId(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    verified: integer("verified", { mode: "boolean" }).notNull().default(true),
    failedVerificationCount: integer("failed_verification_count").notNull().default(0),
    lockedUntil: ts("locked_until"),
  },
  (t) => [uniqueIndex("two_factors_user_uq").on(t.userId)],
)

export const passkeys = sqliteTable(
  "passkeys",
  {
    id: integer("id").primaryKey(),
    userId: userId(),
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
    uniqueIndex("passkeys_credential_uq").on(t.credentialId),
    index("passkeys_user_idx").on(t.userId),
  ],
)
