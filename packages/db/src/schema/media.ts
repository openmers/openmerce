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
import { productVariants } from "./catalog-products"
import { createdAt, publicId, updatedAt } from "./columns"

// 02-ticaret.md section 13 (`media`) and 11 (`digital_assets`), 0007. Delete is a single statement:
// DELETE ... WHERE NOT EXISTS (usages); the media column is indexed in usage tables.

export const media = sqliteTable(
  "media",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    status: text("status", { enum: ["pending", "ready", "rejected"] }).notNull(),
    bucket: text("bucket", { enum: ["public", "private"] }).notNull(),
    // content-addressed path
    key: text("key").notNull(),
    mime: text("mime"),
    bytes: integer("bytes"),
    width: integer("width"),
    height: integer("height"),
    // generated width ladder, e.g. [320, 640, 1000]
    sizes: text("sizes", { mode: "json" }).$type<number[]>(),
    // owner of the personalization image; no FK (polymorphic)
    ownerKind: text("owner_kind", { enum: ["cart", "order"] }),
    ownerId: integer("owner_id"),
    posterMediaId: integer("poster_media_id").references((): AnySQLiteColumn => media.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("media_public_id_uq").on(t.publicId),
    uniqueIndex("media_bucket_key_uq").on(t.bucket, t.key),
    index("media_status_created_idx").on(t.status, t.createdAt),
    index("media_owner_idx").on(t.ownerKind, t.ownerId),
    check("media_status_ck", sql`${t.status} IN ('pending', 'ready', 'rejected')`),
    check("media_bucket_ck", sql`${t.bucket} IN ('public', 'private')`),
    check("media_owner_kind_ck", sql`${t.ownerKind} IN ('cart', 'order')`),
  ],
)

// version is the file version, not an optimistic lock counter
export const digitalAssets = sqliteTable(
  "digital_assets",
  {
    id: integer("id").primaryKey(),
    variantId: integer("variant_id")
      .notNull()
      .references(() => productVariants.id),
    mediaId: integer("media_id")
      .notNull()
      .references(() => media.id),
    version: integer("version").notNull(),
    label: text("label"),
    createdAt: createdAt(),
  },
  (t) => [
    index("digital_assets_variant_idx").on(t.variantId, t.version),
    index("digital_assets_media_idx").on(t.mediaId),
  ],
)
