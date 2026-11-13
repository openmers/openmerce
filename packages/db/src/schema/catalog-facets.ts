import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { products, productVariants } from "./catalog-products"
import { createdAt, updatedAt } from "./columns"

// 02-ticaret.md bölüm 2 (`facets`, `facet_values`, çevirileri, ürün/varyant–değer bağlantısı), 0006.

export const facets = sqliteTable(
  "facets",
  {
    id: integer("id").primaryKey(),
    code: text("code").notNull(),
    // 1 ise yalnız admin; okuma modeline yazılmaz
    private: integer("private", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("facets_code_uq").on(t.code)],
)

export const facetValues = sqliteTable(
  "facet_values",
  {
    id: integer("id").primaryKey(),
    facetId: integer("facet_id")
      .notNull()
      .references(() => facets.id),
    code: text("code").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("facet_values_code_uq").on(t.facetId, t.code)],
)

export const facetTranslations = sqliteTable(
  "facet_translations",
  {
    facetId: integer("facet_id")
      .notNull()
      .references(() => facets.id),
    lang: text("lang").notNull(),
    name: text("name").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ name: "facet_translations_pk", columns: [t.facetId, t.lang] })],
)

export const facetValueTranslations = sqliteTable(
  "facet_value_translations",
  {
    facetValueId: integer("facet_value_id")
      .notNull()
      .references(() => facetValues.id),
    lang: text("lang").notNull(),
    name: text("name").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ name: "facet_value_translations_pk", columns: [t.facetValueId, t.lang] })],
)

// bağlantı satırları güncellenmez (sil + ekle)
export const productFacetValues = sqliteTable(
  "product_facet_values",
  {
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    facetValueId: integer("facet_value_id")
      .notNull()
      .references(() => facetValues.id),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: "product_facet_values_pk", columns: [t.productId, t.facetValueId] }),
    index("product_facet_values_value_idx").on(t.facetValueId, t.productId),
  ],
)

export const variantFacetValues = sqliteTable(
  "variant_facet_values",
  {
    variantId: integer("variant_id")
      .notNull()
      .references(() => productVariants.id),
    facetValueId: integer("facet_value_id")
      .notNull()
      .references(() => facetValues.id),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: "variant_facet_values_pk", columns: [t.variantId, t.facetValueId] }),
    index("variant_facet_values_value_idx").on(t.facetValueId, t.variantId),
  ],
)
