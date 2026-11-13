import {
  type AnySQLiteColumn,
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

// 02-ticaret.md sections 1-2 (`collections`, membership, translation, channel link), 0006.

type Json = Record<string, unknown>

export const collections = sqliteTable(
  "collections",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    parentId: integer("parent_id").references((): AnySQLiteColumn => collections.id),
    position: integer("position").notNull(),
    // CollectionFilter operations [{code, args}]; manual membership is also an operation
    filters: text("filters", { mode: "json" }).$type<{ code: string; args: Json }[]>(),
    inheritFilters: integer("inherit_filters", { mode: "boolean" }).notNull().default(true),
    indexableFilters: text("indexable_filters", { mode: "json" }).$type<unknown[]>(),
    robots: text("robots"),
    version: integer("version").notNull().default(0),
    deletedAt: integer("deleted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("collections_public_id_uq").on(t.publicId),
    index("collections_parent_idx").on(t.parentId, t.position),
  ],
)

// computed membership; the job rewrites rows, no time column
export const collectionVariants = sqliteTable(
  "collection_variants",
  {
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id),
    variantId: integer("variant_id")
      .notNull()
      .references(() => productVariants.id),
  },
  (t) => [
    primaryKey({ name: "collection_variants_pk", columns: [t.collectionId, t.variantId] }),
    index("collection_variants_variant_idx").on(t.variantId),
  ],
)

export const collectionTranslations = sqliteTable(
  "collection_translations",
  {
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id),
    lang: text("lang").notNull(),
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
    primaryKey({ name: "collection_translations_pk", columns: [t.collectionId, t.lang] }),
    uniqueIndex("collection_translations_slug_uq").on(t.lang, t.slug),
  ],
)

export const collectionChannels = sqliteTable(
  "collection_channels",
  {
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: "collection_channels_pk", columns: [t.collectionId, t.channelId] }),
    index("collection_channels_channel_idx").on(t.channelId, t.collectionId),
  ],
)
