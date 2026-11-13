import { sql } from "drizzle-orm"
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { adminUsers } from "./admin-auth"
import { checkoutReservations } from "./cart"
import { channels } from "./channels"
import { createdAt, publicId, updatedAt } from "./columns"
import { customers } from "./customers"

// 02-ticaret.md bölüm 8 (`orders`, `order_events`, `order_notes`), 01 G (`order_guest_access`),
// 00-genel karar 7 (`payment_due_at`), 0015. Yalnız kesinleşmiş sipariş; silinmez. Anlık görüntü:
// adres, kur, yasal sürümler kopyalanır, join edilmez. `company_id` hedefi 0022'de: FK'sız.

type Json = Record<string, unknown>

export const orderStates = ["placed", "completed", "cancelled"] as const
export const orderPaymentStatuses = [
  "awaiting",
  "authorized",
  "paid",
  "partially_refunded",
  "refunded",
] as const
export const orderFulfillmentStatuses = [
  "unfulfilled",
  "partially_fulfilled",
  "fulfilled",
  "delivered",
  "returned",
] as const

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    // yıl + kanal başına sıra, boşluksuz
    number: text("number").notNull(),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    // misafir de bir müşteri satırı
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    companyId: integer("company_id"),
    placedByCustomerId: integer("placed_by_customer_id").references(() => customers.id),
    // settlement: INSERT ... ON CONFLICT(reservation_id) DO NOTHING
    reservationId: integer("reservation_id")
      .notNull()
      .references(() => checkoutReservations.id),
    // rezervasyondan kopya; CHECK yok: abonelik modülü `subscription` ekler (03)
    source: text("source").notNull().default("web"),
    // `SET settlement_token = :uuid WHERE reservation_id = ? AND settlement_token IS NULL`
    settlementToken: text("settlement_token"),
    currency: text("currency").notNull(),
    subtotalNet: integer("subtotal_net").notNull(),
    taxTotal: integer("tax_total").notNull(),
    totalGross: integer("total_gross").notNull(),
    discountTotal: integer("discount_total").notNull(),
    shippingTotal: integer("shipping_total").notNull(),
    shippingAddress: text("shipping_address", { mode: "json" }).$type<Json>(),
    billingAddress: text("billing_address", { mode: "json" }).$type<Json>(),
    // teslimat adresindeki region kopyası (politika kapsamı)
    shippingRegion: text("shipping_region"),
    assignedAdminId: integer("assigned_admin_id").references(() => adminUsers.id),
    state: text("state", { enum: orderStates }).notNull().default("placed"),
    // önbellek: payments/refunds'tan türetilir, aynı atomic() içinde
    paymentStatus: text("payment_status", { enum: orderPaymentStatuses }).notNull(),
    // önbellek: fulfillments'tan türetilir
    fulfillmentStatus: text("fulfillment_status", { enum: orderFulfillmentStatuses })
      .notNull()
      .default("unfulfilled"),
    poNumber: text("po_number"),
    paymentTerms: text("payment_terms"),
    // kredi/vadeli ödeme son günü (karar 7)
    paymentDueAt: integer("payment_due_at"),
    lang: text("lang").notNull(),
    // { base, quote, rate_e9, day }
    fxRate: text("fx_rate", { mode: "json" }).$type<Json>(),
    legalSnapshot: text("legal_snapshot", { mode: "json" }).$type<Json>(),
    stockException: integer("stock_exception", { mode: "boolean" }).notNull().default(false),
    hasPersonalization: integer("has_personalization", { mode: "boolean" })
      .notNull()
      .default(false),
    customFields: text("custom_fields", { mode: "json" }).$type<Json>(),
    placedAt: integer("placed_at").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("orders_public_id_uq").on(t.publicId),
    uniqueIndex("orders_reservation_uq").on(t.reservationId),
    uniqueIndex("orders_number_uq").on(t.channelId, t.number),
    index("orders_channel_placed_idx").on(t.channelId, t.placedAt),
    index("orders_customer_placed_idx").on(t.customerId, t.placedAt),
    index("orders_company_placed_idx").on(t.companyId, t.placedAt),
    // açık siparişler
    index("orders_open_idx").on(t.state).where(sql`${t.state} = 'placed'`),
    index("orders_updated_idx").on(t.updatedAt),
    // rapor; tabloda created_at yok, placed_at kullanılır
    index("orders_source_idx").on(t.channelId, t.source, t.placedAt),
    index("orders_region_idx").on(t.channelId, t.shippingRegion),
    index("orders_payment_due_idx").on(t.paymentDueAt).where(sql`${t.paymentStatus} = 'awaiting'`),
    check("orders_state_ck", sql`${t.state} IN ('placed', 'completed', 'cancelled')`),
    check(
      "orders_payment_status_ck",
      sql`${t.paymentStatus} IN ('awaiting', 'authorized', 'paid', 'partially_refunded', 'refunded')`,
    ),
    check(
      "orders_fulfillment_status_ck",
      sql`${t.fulfillmentStatus} IN ('unfulfilled', 'partially_fulfilled', 'fulfilled', 'delivered', 'returned')`,
    ),
    check("orders_currency_ck", sql`length(${t.currency}) = 3`),
    check(
      "orders_totals_ck",
      sql`typeof(${t.subtotalNet}) = 'integer' AND typeof(${t.taxTotal}) = 'integer' AND typeof(${t.totalGross}) = 'integer' AND typeof(${t.discountTotal}) = 'integer' AND typeof(${t.shippingTotal}) = 'integer'`,
    ),
  ],
)

const orderId = () =>
  integer("order_id")
    .notNull()
    .references(() => orders.id)

// yalnız eklenir; kind'e CHECK yok (built-in app kancası kendi kind'ini yazar)
export const orderEvents = sqliteTable(
  "order_events",
  {
    id: integer("id").primaryKey(),
    orderId: orderId(),
    kind: text("kind").notNull(),
    fromState: text("from_state"),
    toState: text("to_state"),
    actor: text("actor", { mode: "json" }).$type<Json>(),
    data: text("data", { mode: "json" }).$type<Json>(),
    createdAt: createdAt(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
)

// yazar 15 dk içinde düzeltir (`WHERE created_at > now-15dk AND author_id = ?`)
export const orderNotes = sqliteTable(
  "order_notes",
  {
    id: integer("id").primaryKey(),
    orderId: orderId(),
    body: text("body").notNull(),
    visibility: text("visibility", { enum: ["internal", "customer"] }).notNull(),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    // katalogda FK yok
    authorId: integer("author_id").notNull(),
    authorName: text("author_name").notNull(),
    createdAt: createdAt(),
    editedAt: integer("edited_at"),
    deletedAt: integer("deleted_at"),
  },
  (t) => [
    // sabitlenen üstte, kalanı yeniden eskiye
    index("order_notes_order_idx").on(t.orderId, sql`${t.pinned} DESC`, sql`${t.createdAt} DESC`),
    check("order_notes_body_ck", sql`length(${t.body}) <= 5000`),
    check("order_notes_visibility_ck", sql`${t.visibility} IN ('internal', 'customer')`),
  ],
)

// ord_ bilmek yetmez; token (otk_) yalnız SHA-256 özeti; döndürmede eskisi revoked_at alır
export const orderGuestAccess = sqliteTable(
  "order_guest_access",
  {
    id: integer("id").primaryKey(),
    orderId: orderId(),
    tokenHash: text("token_hash").notNull(),
    revokedAt: integer("revoked_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("order_guest_access_token_uq").on(t.tokenHash),
    index("order_guest_access_order_idx").on(t.orderId),
  ],
)
