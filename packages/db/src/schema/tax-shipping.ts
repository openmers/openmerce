import { sql } from "drizzle-orm"
import { check, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { createdAt, publicId, updatedAt } from "./columns"
import { stockLocations } from "./stock"

// 02-ticaret.md bölüm 10 (vergi) ve 11 (`shipping_methods`), 0010. Bölge ve yöntem tabloları
// bellekte. `tax_rates.customer_group_id` hedefi 0011'de açılır: FK'sız.

export const zones = sqliteTable(
  "zones",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    name: text("name").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("zones_public_id_uq").on(t.publicId)],
)

export const zoneMembers = sqliteTable(
  "zone_members",
  {
    zoneId: integer("zone_id")
      .notNull()
      .references(() => zones.id),
    // ISO 3166-1 alpha-2
    country: text("country").notNull(),
    // ISO 3166-2 alt bölge; NULL = tüm ülke
    region: text("region"),
  },
  (t) => [
    // NULL tekrarını önler (NULL'lar benzersiz indekste eşit sayılmaz)
    uniqueIndex("zone_members_uq").on(t.zoneId, t.country, sql`coalesce(${t.region}, '')`),
    check("zone_members_country_ck", sql`length(${t.country}) = 2`),
  ],
)

export const taxCategories = sqliteTable(
  "tax_categories",
  {
    id: integer("id").primaryKey(),
    // API dış anahtarı; standard, reduced, food, book, shipping ... (kapalı liste değil)
    code: text("code").notNull(),
    name: text("name").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("tax_categories_code_uq").on(t.code)],
)

export const taxRates = sqliteTable(
  "tax_rates",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    zoneId: integer("zone_id")
      .notNull()
      .references(() => zones.id),
    taxCategoryId: integer("tax_category_id")
      .notNull()
      .references(() => taxCategories.id),
    // NULL = herkes
    customerGroupId: integer("customer_group_id"),
    // baz puan (%20 = 2000)
    rateBp: integer("rate_bp").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("tax_rates_public_id_uq").on(t.publicId),
    uniqueIndex("tax_rates_uq").on(
      t.zoneId,
      t.taxCategoryId,
      sql`coalesce(${t.customerGroupId}, 0)`,
    ),
    check("tax_rates_rate_ck", sql`typeof(${t.rateBp}) = 'integer' AND ${t.rateBp} >= 0`),
  ],
)

type Json = Record<string, unknown>

export const shippingMethods = sqliteTable(
  "shipping_methods",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    name: text("name").notNull(),
    zoneId: integer("zone_id").references(() => zones.id),
    checkerCode: text("checker_code"),
    checkerArgs: text("checker_args", { mode: "json" }).$type<Json>(),
    // canlı fiyat app'inin zaman aşımı ve yedek ücreti (tutar + para birimi) args içinde
    calculatorCode: text("calculator_code").notNull(),
    calculatorArgs: text("calculator_args", { mode: "json" }).$type<Json>().notNull(),
    taxCategoryId: integer("tax_category_id")
      .notNull()
      .references(() => taxCategories.id),
    // mağazadan teslim yöntemi
    pickupLocationId: integer("pickup_location_id").references(() => stockLocations.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("shipping_methods_public_id_uq").on(t.publicId)],
)
