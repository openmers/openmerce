import { sql } from "drizzle-orm"
import {
  type AnySQLiteColumn,
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
import { users } from "./customer-auth"

// 02-ticaret.md section 1 (`customer_channels`) and 12 (customers), 03 G (`customer_payment_methods`),
// 0011. Delete means anonymize (no `deleted_at`); address is market-independent (00-genel).

type Json = Record<string, unknown>

export const customerSources = ["checkout", "register", "admin", "import", "marketplace"] as const
export const customerStates = ["active", "disabled", "anonymized"] as const

export const customers = sqliteTable(
  "customers",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    // `anon+<id>@invalid` on anonymization
    email: text("email").notNull(),
    // lowercase, trimmed; one record per e-mail
    emailNormalized: text("email_normalized").notNull(),
    emailVerifiedAt: integer("email_verified_at"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    companyName: text("company_name"),
    // E.164
    phone: text("phone"),
    locale: text("locale"),
    // after e-mail verification `UPDATE ... WHERE user_id IS NULL`
    userId: integer("user_id").references(() => users.id),
    assignedAdminId: integer("assigned_admin_id").references(() => adminUsers.id),
    source: text("source", { enum: customerSources }).notNull(),
    state: text("state", { enum: customerStates }).notNull().default("active"),
    defaultShippingAddressId: integer("default_shipping_address_id").references(
      (): AnySQLiteColumn => addresses.id,
    ),
    defaultBillingAddressId: integer("default_billing_address_id").references(
      (): AnySQLiteColumn => addresses.id,
    ),
    mergedInto: integer("merged_into").references((): AnySQLiteColumn => customers.id),
    legalHold: integer("legal_hold", { mode: "boolean" }).notNull().default(false),
    deletionRequestedAt: integer("deletion_requested_at"),
    customFields: text("custom_fields", { mode: "json" }).$type<Json>(),
    metadata: text("metadata", { mode: "json" }).$type<Json>(),
    privateMetadata: text("private_metadata", { mode: "json" }).$type<Json>(),
    createdBy: integer("created_by").references(() => adminUsers.id),
    version: integer("version").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("customers_public_id_uq").on(t.publicId),
    uniqueIndex("customers_email_normalized_uq").on(t.emailNormalized),
    uniqueIndex("customers_user_uq").on(t.userId).where(sql`${t.userId} IS NOT NULL`),
    index("customers_created_idx").on(t.createdAt),
    index("customers_deletion_idx")
      .on(t.deletionRequestedAt)
      .where(sql`${t.deletionRequestedAt} IS NOT NULL`),
    check(
      "customers_source_ck",
      sql`${t.source} IN ('checkout', 'register', 'admin', 'import', 'marketplace')`,
    ),
    check("customers_state_ck", sql`${t.state} IN ('active', 'disabled', 'anonymized')`),
  ],
)

// link rows are never updated
export const customerChannels = sqliteTable(
  "customer_channels",
  {
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: "customer_channels_pk", columns: [t.customerId, t.channelId] }),
    index("customer_channels_channel_idx").on(t.channelId, t.customerId),
  ],
)

// at most 20 per customer: conditional INSERT ... SELECT; hard-deleted on anonymization
export const addresses = sqliteTable(
  "addresses",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    label: text("label"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    company: text("company"),
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: text("city").notNull(),
    region: text("region"),
    district: text("district"),
    postalCode: text("postal_code"),
    // ISO 3166-1 alpha-2
    country: text("country").notNull(),
    phone: text("phone"),
    taxId: text("tax_id"),
    taxIdType: text("tax_id_type"),
    // country-specific fields (country pack, e-invoice module)
    customFields: text("custom_fields", { mode: "json" }).$type<Json>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("addresses_public_id_uq").on(t.publicId),
    index("addresses_customer_idx").on(t.customerId),
    index("addresses_country_idx").on(t.country),
    check("addresses_country_ck", sql`length(${t.country}) = 2`),
  ],
)

// card number is not stored (PCI); token cleared on soft delete
export const customerPaymentMethods = sqliteTable(
  "customer_payment_methods",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    // PaymentHandler code
    handler: text("handler").notNull(),
    providerToken: text("provider_token").notNull(),
    brand: text("brand"),
    last4: text("last4"),
    expMonth: integer("exp_month"),
    expYear: integer("exp_year"),
    // one per customer: application rule
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: integer("deleted_at"),
  },
  (t) => [
    uniqueIndex("customer_payment_methods_public_id_uq").on(t.publicId),
    index("customer_payment_methods_customer_idx").on(t.customerId),
    index("customer_payment_methods_exp_idx").on(t.expYear, t.expMonth),
  ],
)
