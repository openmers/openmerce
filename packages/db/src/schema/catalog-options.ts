import { sql } from "drizzle-orm"
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"
import { products, productVariants } from "./catalog-products"
import { createdAt, updatedAt } from "./columns"
import { media } from "./media"

// 02-ticaret.md bölüm 2 (seçenek, seçenek değeri, çevirileri, ürün görseli), 0006.
// `product_assets.asset_id` hedefi `media` 0007'de açılır (ileri FK, bkz. catalog-products.ts).

export const productOptions = sqliteTable(
  "product_options",
  {
    id: integer("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    code: text("code").notNull(),
    position: integer("position").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("product_options_code_uq").on(t.productId, t.code),
    index("product_options_position_idx").on(t.productId, t.position),
  ],
)

export const optionValues = sqliteTable(
  "option_values",
  {
    id: integer("id").primaryKey(),
    optionId: integer("option_id")
      .notNull()
      .references(() => productOptions.id),
    code: text("code").notNull(),
    position: integer("position").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("option_values_code_uq").on(t.optionId, t.code),
    index("option_values_position_idx").on(t.optionId, t.position),
    // variant_option_values bileşik FK hedefi: değer ile seçeneğin eşleştiğini DB zorlar
    uniqueIndex("option_values_id_option_uq").on(t.id, t.optionId),
  ],
)

// varyantın seçenek değeri kombinasyonu; aynı seçenekten en çok bir değer. Satır güncellenmez.
export const variantOptionValues = sqliteTable(
  "variant_option_values",
  {
    variantId: integer("variant_id")
      .notNull()
      .references(() => productVariants.id),
    optionId: integer("option_id")
      .notNull()
      .references(() => productOptions.id),
    optionValueId: integer("option_value_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: "variant_option_values_pk", columns: [t.variantId, t.optionValueId] }),
    uniqueIndex("variant_option_values_option_uq").on(t.variantId, t.optionId),
    index("variant_option_values_value_idx").on(t.optionValueId, t.variantId),
    foreignKey({
      name: "variant_option_values_value_fk",
      columns: [t.optionValueId, t.optionId],
      foreignColumns: [optionValues.id, optionValues.optionId],
    }),
  ],
)

export const productOptionTranslations = sqliteTable(
  "product_option_translations",
  {
    optionId: integer("option_id")
      .notNull()
      .references(() => productOptions.id),
    lang: text("lang").notNull(),
    name: text("name").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ name: "product_option_translations_pk", columns: [t.optionId, t.lang] })],
)

export const optionValueTranslations = sqliteTable(
  "option_value_translations",
  {
    optionValueId: integer("option_value_id")
      .notNull()
      .references(() => optionValues.id),
    lang: text("lang").notNull(),
    name: text("name").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ name: "option_value_translations_pk", columns: [t.optionValueId, t.lang] })],
)

// atama güncellenmez (sil + ekle); görsel varyant → seçenek değeri → ürün sırasıyla çözülür
export const productAssets = sqliteTable(
  "product_assets",
  {
    id: integer("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    variantId: integer("variant_id").references(() => productVariants.id),
    optionValueId: integer("option_value_id").references(() => optionValues.id),
    assetId: integer("asset_id")
      .notNull()
      .references(() => media.id),
    position: integer("position").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("product_assets_product_idx").on(t.productId, t.position),
    // medya silmede NOT EXISTS kontrolü
    index("product_assets_asset_idx").on(t.assetId),
    check("product_assets_level_ck", sql`${t.variantId} IS NULL OR ${t.optionValueId} IS NULL`),
  ],
)
