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
import { channels } from "./channels"
import { createdAt, publicId, updatedAt } from "./columns"
import { taxCategories } from "./tax-shipping"

// 02-ticaret.md sections 1-2 (product, variant, product translation, product/variant channel link), 0006.
// `tax_category_id` target opens in 0010: SQLite does not check the FK target at CREATE (02 B7),
// so the FK is a forward reference to keep the column NOT NULL; no variant is written before 0010.

type Json = Record<string, unknown>

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    // closed schema, at most 10 fields (validated in code)
    personalization: text("personalization", { mode: "json" }).$type<Json>(),
    // empty = no exception; value comes from the selected legal_policy list
    withdrawalExemptKind: text("withdrawal_exempt_kind"),
    robots: text("robots"),
    // SHA-256 hex of the imported canonical content
    contentHash: text("content_hash"),
    customFields: text("custom_fields", { mode: "json" }).$type<Json>(),
    metadata: text("metadata", { mode: "json" }).$type<Json>(),
    privateMetadata: text("private_metadata", { mode: "json" }).$type<Json>(),
    version: integer("version").notNull().default(0),
    deletedAt: integer("deleted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("products_public_id_uq").on(t.publicId),
    index("products_deleted_updated_idx").on(t.deletedAt, t.updatedAt),
  ],
)

export const productVariants = sqliteTable(
  "product_variants",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    sku: text("sku").notNull(),
    barcode: text("barcode"),
    // gram / millimetre (integer minor-unit pattern)
    weight: integer("weight"),
    length: integer("length"),
    width: integer("width"),
    height: integer("height"),
    taxCategoryId: integer("tax_category_id")
      .notNull()
      .references(() => taxCategories.id),
    trackInventory: integer("track_inventory", { mode: "boolean" }).notNull().default(true),
    allowBackorder: integer("allow_backorder", { mode: "boolean" }).notNull().default(false),
    // ≤ 0; empty means no limit
    backorderFloor: integer("backorder_floor"),
    minOrderQty: integer("min_order_qty"),
    orderMultiple: integer("order_multiple"),
    fulfillmentType: text("fulfillment_type", { enum: ["physical", "digital"] })
      .notNull()
      .default("physical"),
    leadTimeDays: integer("lead_time_days"),
    // null = inherit from product, {enabled:false} = disabled
    personalization: text("personalization", { mode: "json" }).$type<Json>(),
    baseVariantId: integer("base_variant_id").references((): AnySQLiteColumn => productVariants.id),
    unitFactor: integer("unit_factor").notNull().default(1),
    withdrawalExemptKind: text("withdrawal_exempt_kind"),
    customFields: text("custom_fields", { mode: "json" }).$type<Json>(),
    metadata: text("metadata", { mode: "json" }).$type<Json>(),
    privateMetadata: text("private_metadata", { mode: "json" }).$type<Json>(),
    version: integer("version").notNull().default(0),
    deletedAt: integer("deleted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("product_variants_public_id_uq").on(t.publicId),
    // a deleted variant's SKU can be reused
    uniqueIndex("product_variants_sku_uq").on(t.sku).where(sql`${t.deletedAt} IS NULL`),
    index("product_variants_product_idx").on(t.productId),
    index("product_variants_base_idx").on(t.baseVariantId),
    check("product_variants_unit_factor_ck", sql`${t.unitFactor} >= 1`),
    check(
      "product_variants_fulfillment_type_ck",
      sql`${t.fulfillmentType} IN ('physical', 'digital')`,
    ),
    check("product_variants_backorder_floor_ck", sql`${t.backorderFloor} <= 0`),
    // base variant cannot be itself; chain and same-product rules in code (04 section 8)
    check("product_variants_base_ck", sql`${t.baseVariantId} <> ${t.id}`),
  ],
)

export const productTranslations = sqliteTable(
  "product_translations",
  {
    id: integer("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    lang: text("lang").notNull(),
    // empty = all channels; set = override for that channel
    channelId: integer("channel_id").references(() => channels.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    social: text("social", { mode: "json" }).$type<Json>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // prevents NULL duplicates (NULLs are not equal in a unique index)
    uniqueIndex("product_translations_uq").on(t.productId, t.lang, sql`ifnull(${t.channelId}, 0)`),
    uniqueIndex("product_translations_slug_uq").on(t.lang, t.slug),
  ],
)

export const productChannels = sqliteTable(
  "product_channels",
  {
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: "product_channels_pk", columns: [t.productId, t.channelId] }),
    index("product_channels_channel_idx").on(t.channelId, t.productId),
  ],
)

export const variantChannels = sqliteTable(
  "variant_channels",
  {
    variantId: integer("variant_id")
      .notNull()
      .references(() => productVariants.id),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: "variant_channels_pk", columns: [t.variantId, t.channelId] }),
    index("variant_channels_channel_idx").on(t.channelId, t.variantId),
  ],
)
