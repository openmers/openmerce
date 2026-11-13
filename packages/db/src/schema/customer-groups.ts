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
import { createdAt, publicId, updatedAt } from "./columns"
import { customers } from "./customers"

// 02-ticaret.md section 12: groups, tags, notes, permissions (0011, split from customers.ts).

export const consentChannels = ["email", "sms", "call", "push"] as const
export const consentPurposes = ["marketing", "analytics"] as const
export const consentStatuses = ["granted", "withdrawn"] as const
export const consentSources = [
  "checkout",
  "account",
  "admin",
  "import",
  "unsubscribe",
  "bounce",
] as const

const customerId = () =>
  integer("customer_id")
    .notNull()
    .references(() => customers.id)

// at most 20 smart groups; rule_version increases when the rule changes (application rule)
export const customerGroups = sqliteTable(
  "customer_groups",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    name: text("name").notNull(),
    description: text("description"),
    kind: text("kind", { enum: ["manual", "smart"] }).notNull(),
    // closed schema; at most 12 conditions, 2 levels
    rule: text("rule", { mode: "json" }).$type<Record<string, unknown>>(),
    affectsCommerce: integer("affects_commerce", { mode: "boolean" }).notNull(),
    ruleVersion: integer("rule_version").notNull().default(0),
    lastEvaluatedAt: integer("last_evaluated_at"),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("customer_groups_public_id_uq").on(t.publicId),
    check("customer_groups_kind_ck", sql`${t.kind} IN ('manual', 'smart')`),
  ],
)

export const customerGroupMembers = sqliteTable(
  "customer_group_members",
  {
    groupId: integer("group_id")
      .notNull()
      .references(() => customerGroups.id),
    customerId: customerId(),
    source: text("source", { enum: ["manual", "rule"] }).notNull(),
    addedAt: integer("added_at").notNull(),
  },
  (t) => [
    primaryKey({ name: "customer_group_members_pk", columns: [t.groupId, t.customerId] }),
    index("customer_group_members_customer_idx").on(t.customerId),
    check("customer_group_members_source_ck", sql`${t.source} IN ('manual', 'rule')`),
  ],
)

export const customerTags = sqliteTable(
  "customer_tags",
  {
    customerId: customerId(),
    // trimmed, lowercase
    tag: text("tag").notNull(),
  },
  (t) => [
    primaryKey({ name: "customer_tags_pk", columns: [t.customerId, t.tag] }),
    index("customer_tags_tag_idx").on(t.tag),
  ],
)

export const customerNotes = sqliteTable(
  "customer_notes",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    customerId: customerId(),
    authorId: integer("author_id")
      .notNull()
      .references(() => adminUsers.id),
    body: text("body").notNull(),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("customer_notes_public_id_uq").on(t.publicId),
    index("customer_notes_customer_idx").on(t.customerId, t.createdAt),
    check("customer_notes_body_ck", sql`length(${t.body}) <= 5000`),
  ],
)

// append-only; kept as evidence after anonymization
export const consents = sqliteTable(
  "consents",
  {
    id: integer("id").primaryKey(),
    customerId: customerId(),
    channel: text("channel", { enum: consentChannels }).notNull(),
    purpose: text("purpose", { enum: consentPurposes }).notNull(),
    status: text("status", { enum: consentStatuses }).notNull(),
    source: text("source", { enum: consentSources }).notNull(),
    reason: text("reason"),
    textVersion: text("text_version"),
    // raw IP is not stored
    ipHash: text("ip_hash"),
    createdAt: createdAt(),
  },
  (t) => [
    index("consents_customer_idx").on(t.customerId, t.createdAt),
    check("consents_channel_ck", sql`${t.channel} IN ('email', 'sms', 'call', 'push')`),
    check("consents_purpose_ck", sql`${t.purpose} IN ('marketing', 'analytics')`),
    check("consents_status_ck", sql`${t.status} IN ('granted', 'withdrawn')`),
    check(
      "consents_source_ck",
      sql`${t.source} IN ('checkout', 'account', 'admin', 'import', 'unsubscribe', 'bounce')`,
    ),
    // reason required for admin source
    check("consents_reason_ck", sql`${t.source} <> 'admin' OR ${t.reason} IS NOT NULL`),
  ],
)

// updated inside the same atomic() as the consents write
export const customerConsentState = sqliteTable(
  "customer_consent_state",
  {
    customerId: customerId(),
    channel: text("channel", { enum: consentChannels }).notNull(),
    purpose: text("purpose", { enum: consentPurposes }).notNull(),
    status: text("status", { enum: consentStatuses }).notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({
      name: "customer_consent_state_pk",
      columns: [t.customerId, t.channel, t.purpose],
    }),
    index("customer_consent_state_filter_idx").on(t.channel, t.purpose, t.status),
    check(
      "customer_consent_state_channel_ck",
      sql`${t.channel} IN ('email', 'sms', 'call', 'push')`,
    ),
    check("customer_consent_state_purpose_ck", sql`${t.purpose} IN ('marketing', 'analytics')`),
    check("customer_consent_state_status_ck", sql`${t.status} IN ('granted', 'withdrawn')`),
  ],
)
