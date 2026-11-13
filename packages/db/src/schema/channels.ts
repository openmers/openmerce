import { sql } from "drizzle-orm"
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { createdAt, publicId, updatedAt } from "./columns"

// 02-ticaret.md `channels` / `channel_domains`, 04-asama-1-db-plani §3.2. Zone ve fiyat listesi FK
// sütunları hedef tabloların migration'ında eklemeli gelir (0008, 0010).
export const channels = sqliteTable(
  "channels",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    code: text("code").notNull(),
    type: text("type", { enum: ["b2c", "b2b", "hybrid"] })
      .notNull()
      .default("b2c"),
    defaultCurrency: text("default_currency").notNull(),
    currencies: text("currencies", { mode: "json" }).$type<string[]>().notNull(),
    defaultLang: text("default_lang").notNull().default("en"),
    langs: text("langs", { mode: "json" }).$type<string[]>().notNull(),
    pricesIncludeTax: integer("prices_include_tax", { mode: "boolean" }).notNull().default(false),
    access: text("access", { enum: ["public", "login_required", "approved_companies_only"] })
      .notNull()
      .default("public"),
    guestCheckout: integer("guest_checkout", { mode: "boolean" }).notNull().default(true),
    // para birimi başına küçük birim, { "USD": 5000 } (§6 karar 14)
    minOrderAmounts: text("min_order_amounts", { mode: "json" }).$type<Record<string, number>>(),
    syncPrices: integer("sync_prices", { mode: "boolean" }).notNull().default(false),
    statementName: text("statement_name"),
    timezone: text("timezone").notNull().default("UTC"),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    // görünüm/iletişim ayarları; şema kodda (features/channels/settings.ts)
    settings: text("settings", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'`),
    settingsVersion: integer("settings_version").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("channels_public_id_uq").on(t.publicId),
    uniqueIndex("channels_code_uq").on(t.code),
    uniqueIndex("channels_default_uq").on(t.isDefault).where(sql`${t.isDefault} = 1`),
    check("channels_code_ck", sql`${t.code} = lower(${t.code})`),
    check("channels_type_ck", sql`${t.type} IN ('b2c', 'b2b', 'hybrid')`),
    check("channels_default_currency_ck", sql`length(${t.defaultCurrency}) = 3`),
    check(
      "channels_access_ck",
      sql`${t.access} IN ('public', 'login_required', 'approved_companies_only')`,
    ),
    // JSON nesne olmalı; NULL'da json_type NULL döner, check geçer
    check("channels_min_order_amounts_ck", sql`json_type(${t.minOrderAmounts}) = 'object'`),
    check("channels_settings_ck", sql`json_type(${t.settings}) = 'object'`),
  ],
)

export const channelDomains = sqliteTable(
  "channel_domains",
  {
    id: integer("id").primaryKey(),
    // ON DELETE yok: alan adı olan kanal silinmez (§6 karar 4)
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    domain: text("domain").notNull(),
    defaultLang: text("default_lang"),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    // yalnız ikincil alan adında: redirect (birincile 301) | serve; birincilde NULL
    secondaryMode: text("secondary_mode", { enum: ["redirect", "serve"] }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("channel_domains_domain_uq").on(t.domain),
    uniqueIndex("channel_domains_primary_uq").on(t.channelId).where(sql`${t.isPrimary} = 1`),
    index("channel_domains_channel_idx").on(t.channelId),
    check("channel_domains_domain_ck", sql`${t.domain} = lower(${t.domain})`),
    check("channel_domains_secondary_mode_ck", sql`${t.secondaryMode} IN ('redirect', 'serve')`),
    // katalog 02 `channel_domains`: birincilde boş, ikincilde dolu
    check(
      "channel_domains_primary_mode_ck",
      sql`(${t.isPrimary} = 1) = (${t.secondaryMode} IS NULL)`,
    ),
  ],
)
