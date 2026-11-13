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
import { productVariants } from "./catalog-products"
import { channels } from "./channels"
import { createdAt, publicId, updatedAt } from "./columns"

// 02-ticaret.md bölüm 1 (`channel_stock_locations`) ve 5 (stok), 0009. Ayırma koşullu UPDATE'tir
// (`on_hand - reserved - safety >= :n`, backorder'da `backorder_floor`); satılabilir eksiye
// inebilir, sayaçlar inemez.

export const stockLocations = sqliteTable(
  "stock_locations",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    name: text("name").notNull(),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    region: text("region"),
    district: text("district"),
    postalCode: text("postal_code"),
    // ISO 3166-1 alpha-2
    countryCode: text("country_code"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    pickupEnabled: integer("pickup_enabled", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("stock_locations_public_id_uq").on(t.publicId),
    check("stock_locations_country_ck", sql`length(${t.countryCode}) = 2`),
  ],
)

export const channelStockLocations = sqliteTable(
  "channel_stock_locations",
  {
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    locationId: integer("location_id")
      .notNull()
      .references(() => stockLocations.id),
    // küçük önce
    priority: integer("priority").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ name: "channel_stock_locations_pk", columns: [t.channelId, t.locationId] })],
)

// yalnız taban varyant; paket varyantının satırı olmaz (kodda)
export const stockLevels = sqliteTable(
  "stock_levels",
  {
    variantId: integer("variant_id")
      .notNull()
      .references(() => productVariants.id),
    locationId: integer("location_id")
      .notNull()
      .references(() => stockLocations.id),
    onHand: integer("on_hand").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    safety: integer("safety").notNull().default(0),
    version: integer("version").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: "stock_levels_pk", columns: [t.variantId, t.locationId] }),
    check(
      "stock_levels_counts_ck",
      sql`${t.onHand} >= 0 AND ${t.reserved} >= 0 AND ${t.safety} >= 0`,
    ),
  ],
)

export const stockMovementKinds = [
  "adjustment",
  "reservation",
  "release",
  "sale",
  "return",
  "transfer",
  "erp_sync",
] as const
export const stockMovementRefTypes = [
  "reservation",
  "order",
  "fulfillment",
  "return",
  "import",
  "manual",
] as const

// yalnız eklenir; silinmez, güncellenmez
export const stockMovements = sqliteTable(
  "stock_movements",
  {
    id: integer("id").primaryKey(),
    // taban varyant
    variantId: integer("variant_id")
      .notNull()
      .references(() => productVariants.id),
    // satılan paket varyantı; paketsizde boş
    soldVariantId: integer("sold_variant_id").references(() => productVariants.id),
    locationId: integer("location_id")
      .notNull()
      .references(() => stockLocations.id),
    kind: text("kind", { enum: stockMovementKinds }).notNull(),
    // işaretli, satılan varyantın biriminde
    quantity: integer("quantity").notNull(),
    // işaretli taban birim farkı
    units: integer("units").notNull(),
    refType: text("ref_type", { enum: stockMovementRefTypes }),
    // ilgili tablonun iç id'si; FK yok (çok biçimli)
    refId: integer("ref_id"),
    createdAt: createdAt(),
  },
  (t) => [
    index("stock_movements_level_idx").on(t.variantId, t.locationId, t.createdAt),
    index("stock_movements_ref_idx").on(t.refType, t.refId),
    check(
      "stock_movements_kind_ck",
      sql`${t.kind} IN ('adjustment', 'reservation', 'release', 'sale', 'return', 'transfer', 'erp_sync')`,
    ),
    check(
      "stock_movements_ref_type_ck",
      sql`${t.refType} IN ('reservation', 'order', 'fulfillment', 'return', 'import', 'manual')`,
    ),
  ],
)
