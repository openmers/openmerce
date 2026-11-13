import { sql } from "drizzle-orm"
import {
  type AnySQLiteColumn,
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"
import { createdAt, publicId, updatedAt } from "./columns"
import { priceLists } from "./pricing"
import { zones } from "./tax-shipping"

// 02-ticaret.md `channels` / `channel_domains`, 04-asama-1-db-plani §3.2. Zone and price list FK
// columns arrived additively in the target tables' migrations (0008, 0010).
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
    // minor unit per currency, { "USD": 5000 } (§6 decision 14)
    minOrderAmounts: text("min_order_amounts", { mode: "json" }).$type<Record<string, number>>(),
    syncPrices: integer("sync_prices", { mode: "boolean" }).notNull().default(false),
    statementName: text("statement_name"),
    timezone: text("timezone").notNull().default("UTC"),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    // appearance/contact settings; schema in code (features/channels/settings.ts)
    settings: text("settings", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'`),
    settingsVersion: integer("settings_version").notNull().default(0),
    // regions used when there is no address (0010)
    defaultTaxZoneId: integer("default_tax_zone_id").references((): AnySQLiteColumn => zones.id),
    defaultShippingZoneId: integer("default_shipping_zone_id").references(
      (): AnySQLiteColumn => zones.id,
    ),
    // channel is created before the listing; an empty channel cannot sell (0008)
    defaultPriceListId: integer("default_price_list_id").references(
      (): AnySQLiteColumn => priceLists.id,
    ),
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
    // must be a JSON object; with NULL json_type returns NULL, check passes
    check("channels_min_order_amounts_ck", sql`json_type(${t.minOrderAmounts}) = 'object'`),
    check("channels_settings_ck", sql`json_type(${t.settings}) = 'object'`),
  ],
)

export const channelDomains = sqliteTable(
  "channel_domains",
  {
    id: integer("id").primaryKey(),
    // no ON DELETE: a channel with domains is not deleted (§6 decision 4)
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    domain: text("domain").notNull(),
    defaultLang: text("default_lang"),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    // secondary domains only: redirect (301 to primary) | serve; NULL on primary
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
    // catalog 02 `channel_domains`: empty on primary, set on secondary
    check(
      "channel_domains_primary_mode_ck",
      sql`(${t.isPrimary} = 1) = (${t.secondaryMode} IS NULL)`,
    ),
  ],
)
