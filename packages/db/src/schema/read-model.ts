import { sql } from "drizzle-orm"
import { check, index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { updatedAt } from "./columns"
import { customers } from "./customers"

// 02-ticaret.md section 3 (storefront read model) and the customer read tables, 0018.
// Derived tables: only the reindex job writes them, so no FK to the write model (a source delete is cleaned
// by reindex). The FTS5 virtual tables `catalog_fts` and `customer_search` cannot be expressed in Drizzle;
// they live as raw SQL in `0018_read-model.sql` (see CATALOG_FTS / CUSTOMER_SEARCH below).
// `catalog_index_facets` and `catalog_index_collections` are `WITHOUT ROWID` in the SQL (hand-added).

type Json = Record<string, unknown>

/** FTS5: `rowid` = `catalog_index.rowid`; folded name, SKUs, facet value names, description excerpt. */
export const CATALOG_FTS = "catalog_fts"
/** FTS5: `rowid` = `customers.id`; email, name, phone digits, company name, reversed phone digits. */
export const CUSTOMER_SEARCH = "customer_search"

export const stockBuckets = ["out", "low", "in_stock"] as const

export const catalogIndex = sqliteTable(
  "catalog_index",
  {
    channelId: integer("channel_id").notNull(),
    lang: text("lang").notNull(),
    variantId: integer("variant_id").notNull(),
    productId: integer("product_id").notNull(),
    productPublicId: text("product_public_id").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    // the variant's own small image
    thumb: text("thumb", { mode: "json" }).$type<Json>(),
    // display only; filtering goes through the match tables
    collectionIds: text("collection_ids", { mode: "json" }).$type<number[]>(),
    facetValueIds: text("facet_value_ids", { mode: "json" }).$type<number[]>(),
    // group_first row: range over all channel variants; other rows: the variant's own tier range
    priceMin: integer("price_min"),
    priceMax: integer("price_max"),
    currency: text("currency").notNull(),
    stockBucket: text("stock_bucket", { enum: stockBuckets }).notNull(),
    leadTimeDays: integer("lead_time_days"),
    sortName: text("sort_name").notNull(),
    // product creation time ("newest" sort), not the row write time
    createdAt: integer("created_at").notNull(),
    salesRank: integer("sales_rank"),
    groupFirst: integer("group_first", { mode: "boolean" }).notNull(),
  },
  (t) => [
    // rowid table on purpose: catalog_fts links by rowid
    primaryKey({ name: "catalog_index_pk", columns: [t.channelId, t.lang, t.variantId] }),
    index("catalog_index_name_idx").on(t.channelId, t.lang, t.groupFirst, t.sortName, t.variantId),
    index("catalog_index_created_idx").on(
      t.channelId,
      t.lang,
      t.groupFirst,
      t.createdAt,
      t.variantId,
    ),
    index("catalog_index_price_idx").on(t.channelId, t.lang, t.groupFirst, t.priceMin, t.variantId),
    index("catalog_index_sales_idx").on(
      t.channelId,
      t.lang,
      t.groupFirst,
      t.salesRank,
      t.variantId,
    ),
    index("catalog_index_product_idx").on(t.productId),
    check("catalog_index_stock_bucket_ck", sql`${t.stockBucket} IN ('out', 'low', 'in_stock')`),
    check("catalog_index_currency_ck", sql`length(${t.currency}) = 3`),
  ],
)

// language independent; joined to catalog_index by (channel_id, :lang, variant_id)
export const catalogIndexFacets = sqliteTable(
  "catalog_index_facets",
  {
    channelId: integer("channel_id").notNull(),
    facetValueId: integer("facet_value_id").notNull(),
    variantId: integer("variant_id").notNull(),
  },
  (t) => [
    primaryKey({
      name: "catalog_index_facets_pk",
      columns: [t.channelId, t.facetValueId, t.variantId],
    }),
  ],
)

export const catalogIndexCollections = sqliteTable(
  "catalog_index_collections",
  {
    channelId: integer("channel_id").notNull(),
    collectionId: integer("collection_id").notNull(),
    variantId: integer("variant_id").notNull(),
  },
  (t) => [
    primaryKey({
      name: "catalog_index_collections_pk",
      columns: [t.channelId, t.collectionId, t.variantId],
    }),
  ],
)

export const productView = sqliteTable(
  "product_view",
  {
    channelId: integer("channel_id").notNull(),
    lang: text("lang").notNull(),
    slug: text("slug").notNull(),
    productId: integer("product_id").notNull(),
    data: text("data", { mode: "json" }).$type<Json>().notNull(),
  },
  (t) => [
    primaryKey({ name: "product_view_pk", columns: [t.channelId, t.lang, t.slug] }),
    index("product_view_product_idx").on(t.productId),
  ],
)

// recomputed (never incremented) from order events; schema only in 0018
export const customerStats = sqliteTable(
  "customer_stats",
  {
    customerId: integer("customer_id")
      .primaryKey()
      .references(() => customers.id),
    ordersCount: integer("orders_count").notNull(),
    paidOrdersCount: integer("paid_orders_count").notNull(),
    firstOrderAt: integer("first_order_at"),
    lastOrderAt: integer("last_order_at"),
    lastSeenAt: integer("last_seen_at"),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("customer_stats_last_order_idx").on(t.lastOrderAt),
    index("customer_stats_orders_count_idx").on(t.ordersCount),
  ],
)

// no currency conversion; the shown value is total_paid - total_refunded
export const customerSpend = sqliteTable(
  "customer_spend",
  {
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    currency: text("currency").notNull(),
    totalPaid: integer("total_paid").notNull(),
    totalRefunded: integer("total_refunded").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: "customer_spend_pk", columns: [t.customerId, t.currency] }),
    index("customer_spend_net_idx").on(t.currency, sql`(${t.totalPaid} - ${t.totalRefunded})`),
    check("customer_spend_currency_ck", sql`length(${t.currency}) = 3`),
  ],
)
