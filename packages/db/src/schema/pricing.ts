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
import { productVariants } from "./catalog-products"
import { channels } from "./channels"
import { createdAt, publicId, updatedAt } from "./columns"

// 02-ticaret.md section 4 (price lists, targets, prices, `currency_rates` decision 10), 0008.
// `price_list_targets` targets open later (`customer_groups` 0011, `companies` 0023): no FK.

export const priceLists = sqliteTable(
  "price_lists",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    name: text("name").notNull(),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    // immutable after creation; prices.currency matches this
    currency: text("currency").notNull(),
    type: text("type", { enum: ["base", "sale", "contract"] }).notNull(),
    priority: integer("priority").notNull(),
    startsAt: integer("starts_at"),
    endsAt: integer("ends_at"),
    includesTax: integer("includes_tax", { mode: "boolean" }).notNull(),
    status: text("status", { enum: ["active", "expired"] })
      .notNull()
      .default("active"),
    // if set, target of the rate conversion job
    fxSourcePriceListId: integer("fx_source_price_list_id").references(
      (): AnySQLiteColumn => priceLists.id,
    ),
    // e.g. { "mode": "ceil", "step": 100, "ending": 99 }
    fxRounding: text("fx_rounding", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("price_lists_public_id_uq").on(t.publicId),
    index("price_lists_channel_type_idx").on(t.channelId, t.type),
    // one base list per channel and currency
    uniqueIndex("price_lists_base_uq").on(t.channelId, t.currency).where(sql`${t.type} = 'base'`),
    index("price_lists_fx_source_idx").on(t.fxSourcePriceListId),
    check("price_lists_currency_ck", sql`length(${t.currency}) = 3`),
    check("price_lists_type_ck", sql`${t.type} IN ('base', 'sale', 'contract')`),
    check("price_lists_status_ck", sql`${t.status} IN ('active', 'expired')`),
  ],
)

// both empty means target "everyone"; rows are never updated (delete + insert)
export const priceListTargets = sqliteTable(
  "price_list_targets",
  {
    id: integer("id").primaryKey(),
    priceListId: integer("price_list_id")
      .notNull()
      .references(() => priceLists.id),
    customerGroupId: integer("customer_group_id"),
    companyId: integer("company_id"),
    createdAt: createdAt(),
  },
  (t) => [
    // prevents NULL duplicates (NULLs are not equal in a unique index)
    uniqueIndex("price_list_targets_uq").on(
      t.priceListId,
      sql`ifnull(${t.customerGroupId}, 0)`,
      sql`ifnull(${t.companyId}, 0)`,
    ),
    index("price_list_targets_group_idx").on(t.customerGroupId),
    index("price_list_targets_company_idx").on(t.companyId),
    check(
      "price_list_targets_target_ck",
      sql`${t.customerGroupId} IS NULL OR ${t.companyId} IS NULL`,
    ),
  ],
)

export const prices = sqliteTable(
  "prices",
  {
    priceListId: integer("price_list_id")
      .notNull()
      .references(() => priceLists.id),
    variantId: integer("variant_id")
      .notNull()
      .references(() => productVariants.id),
    minQty: integer("min_qty").notNull().default(1),
    // minor unit
    amount: integer("amount").notNull(),
    compareAtAmount: integer("compare_at_amount"),
    currency: text("currency").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // serves the storefront `variant_id IN (...) AND price_list_id IN (...)` query
    primaryKey({ name: "prices_pk", columns: [t.priceListId, t.variantId, t.minQty] }),
    check("prices_min_qty_ck", sql`${t.minQty} >= 1`),
    // INTEGER affinity leaves 1.5 as REAL; money is integer only
    check("prices_amount_ck", sql`typeof(${t.amount}) = 'integer' AND ${t.amount} >= 0`),
    check(
      "prices_compare_at_amount_ck",
      sql`typeof(${t.compareAtAmount}) IN ('integer', 'null') AND ${t.compareAtAmount} >= 0`,
    ),
    check("prices_currency_ck", sql`length(${t.currency}) = 3`),
  ],
)

// 1 base = rate_e9 / 10^9 quote; not used at request time
export const currencyRates = sqliteTable(
  "currency_rates",
  {
    // YYYY-MM-DD, UTC calendar day
    day: text("day").notNull(),
    base: text("base").notNull(),
    quote: text("quote").notNull(),
    rateE9: integer("rate_e9").notNull(),
    // `manual` or a RateProvider code
    source: text("source").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: "currency_rates_pk", columns: [t.day, t.base, t.quote] }),
    // latest rate of the pair
    index("currency_rates_pair_idx").on(t.base, t.quote, t.day),
    check("currency_rates_day_ck", sql`${t.day} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`),
    check(
      "currency_rates_pair_ck",
      sql`length(${t.base}) = 3 AND length(${t.quote}) = 3 AND ${t.base} <> ${t.quote}`,
    ),
    check("currency_rates_rate_ck", sql`typeof(${t.rateE9}) = 'integer' AND ${t.rateE9} > 0`),
  ],
)
