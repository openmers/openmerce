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
import { createdAt, publicId, updatedAt } from "./columns"
import { customers } from "./customers"
import { media } from "./media"
import { orderLines } from "./order-lines"
import { orders } from "./orders"
import { stockLocations } from "./stock"

// 02-ticaret.md bölüm 11 (gönderim, gönderim satırı, ürün iadesi, dijital hak), 0016. Durum
// geçişleri koşullu (`UPDATE ... WHERE state = ?`), version yok.

export const fulfillmentStates = ["pending", "shipped", "delivered", "cancelled"] as const
export const returnStates = ["requested", "approved", "received", "rejected"] as const

export const fulfillments = sqliteTable(
  "fulfillments",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id),
    // dijitalde boş
    locationId: integer("location_id").references(() => stockLocations.id),
    kind: text("kind", { enum: ["physical", "digital"] })
      .notNull()
      .default("physical"),
    state: text("state", { enum: fulfillmentStates }).notNull().default("pending"),
    // FulfillmentHandler kodu
    handlerCode: text("handler_code").notNull().default("manual"),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    trackingUrlTemplate: text("tracking_url_template"),
    labelMediaId: integer("label_media_id").references(() => media.id),
    // cayma süresinin başlangıcı
    deliveredAt: integer("delivered_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("fulfillments_public_id_uq").on(t.publicId),
    index("fulfillments_order_idx").on(t.orderId),
    // taşıyıcı webhook eşleşmesi
    index("fulfillments_tracking_idx").on(t.carrier, t.trackingNumber),
    check("fulfillments_kind_ck", sql`${t.kind} IN ('physical', 'digital')`),
    check(
      "fulfillments_state_ck",
      sql`${t.state} IN ('pending', 'shipped', 'delivered', 'cancelled')`,
    ),
  ],
)

// gönderilen adet sipariş adedini aşamaz: koşullu INSERT ... SELECT (iptal gönderim sayılmaz)
export const fulfillmentLines = sqliteTable(
  "fulfillment_lines",
  {
    fulfillmentId: integer("fulfillment_id")
      .notNull()
      .references(() => fulfillments.id),
    orderLineId: integer("order_line_id")
      .notNull()
      .references(() => orderLines.id),
    quantity: integer("quantity").notNull(),
  },
  (t) => [
    primaryKey({ name: "fulfillment_lines_pk", columns: [t.fulfillmentId, t.orderLineId] }),
    index("fulfillment_lines_order_line_idx").on(t.orderLineId),
    check("fulfillment_lines_quantity_ck", sql`${t.quantity} > 0`),
  ],
)

// teslim alınınca satılabilir satırlar için on_hand +, para iadesi ayrı adım
export const returns = sqliteTable(
  "returns",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id),
    // [{order_line_id, quantity, restockable}]; ayrı return_lines yok
    lines: text("lines", { mode: "json" })
      .$type<{ order_line_id: number; quantity: number; restockable: boolean }[]>()
      .notNull(),
    reason: text("reason"),
    state: text("state", { enum: returnStates }).notNull().default("requested"),
    kind: text("kind", { enum: ["withdrawal", "other"] }).notNull(),
    noticeChannel: text("notice_channel", { enum: ["form", "email", "written"] }),
    noticeAt: integer("notice_at"),
    // taşıyıcı app'inden iade kargo kodu
    returnCode: text("return_code"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("returns_public_id_uq").on(t.publicId),
    index("returns_order_idx").on(t.orderId),
    // bekleyen iadeler kuyruğu
    index("returns_state_idx").on(t.state, t.createdAt),
    check("returns_lines_ck", sql`json_type(${t.lines}) = 'array'`),
    check("returns_state_ck", sql`${t.state} IN ('requested', 'approved', 'received', 'rejected')`),
    check("returns_kind_ck", sql`${t.kind} IN ('withdrawal', 'other')`),
    check("returns_notice_channel_ck", sql`${t.noticeChannel} IN ('form', 'email', 'written')`),
  ],
)

// indirme: `downloads = downloads + 1 WHERE downloads < download_limit AND revoked_at IS NULL
// AND expires_at > ?`; bağlantı ve jeton sipariş alanı olarak dönmez
export const digitalEntitlements = sqliteTable(
  "digital_entitlements",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    orderLineId: integer("order_line_id")
      .notNull()
      .references(() => orderLines.id),
    // misafirde boş
    customerId: integer("customer_id").references(() => customers.id),
    mediaId: integer("media_id")
      .notNull()
      .references(() => media.id),
    // yalnız özet
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at").notNull(),
    downloadLimit: integer("download_limit").notNull(),
    downloads: integer("downloads").notNull().default(0),
    revokedAt: integer("revoked_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("digital_entitlements_public_id_uq").on(t.publicId),
    uniqueIndex("digital_entitlements_token_uq").on(t.tokenHash),
    index("digital_entitlements_order_line_idx").on(t.orderLineId),
    check(
      "digital_entitlements_downloads_ck",
      sql`${t.downloads} >= 0 AND ${t.downloadLimit} >= 0`,
    ),
  ],
)
