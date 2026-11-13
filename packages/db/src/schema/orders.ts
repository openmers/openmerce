import { sql } from "drizzle-orm"
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { adminUsers } from "./admin-auth"
import { checkoutReservations } from "./cart"
import { channels } from "./channels"
import { createdAt, publicId, updatedAt } from "./columns"
import { customers } from "./customers"

// 02-ticaret.md section 8 (`orders`, `order_events`, `order_notes`), 01 G (`order_guest_access`),
// 00-genel decision 7 (`payment_due_at`), 0015. Only finalized orders; never deleted. Snapshot:
// address, rate, legal versions are copied, not joined. `company_id` target is 0023: no FK.

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
    // sequence per year + channel, gap-free
    number: text("number").notNull(),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    // a guest is also a customer row
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    companyId: integer("company_id"),
    placedByCustomerId: integer("placed_by_customer_id").references(() => customers.id),
    // settlement: INSERT ... ON CONFLICT(reservation_id) DO NOTHING
    reservationId: integer("reservation_id")
      .notNull()
      .references(() => checkoutReservations.id),
    // copied from the reservation; no CHECK: the subscription module adds `subscription` (03)
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
    // copy of the region from the delivery address (policy scope)
    shippingRegion: text("shipping_region"),
    assignedAdminId: integer("assigned_admin_id").references(() => adminUsers.id),
    state: text("state", { enum: orderStates }).notNull().default("placed"),
    // cache: derived from payments/refunds, in the same atomic()
    paymentStatus: text("payment_status", { enum: orderPaymentStatuses }).notNull(),
    // cache: derived from fulfillments
    fulfillmentStatus: text("fulfillment_status", { enum: orderFulfillmentStatuses })
      .notNull()
      .default("unfulfilled"),
    poNumber: text("po_number"),
    paymentTerms: text("payment_terms"),
    // last due day for credit/invoice payment (decision 7)
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
    // open orders
    index("orders_open_idx").on(t.state).where(sql`${t.state} = 'placed'`),
    index("orders_updated_idx").on(t.updatedAt),
    // report; no created_at in the table, placed_at is used
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

// append-only; no CHECK on kind (a built-in app hook writes its own kind)
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

// the author can fix it within 15 min (`WHERE created_at > now-15min AND author_id = ?`)
export const orderNotes = sqliteTable(
  "order_notes",
  {
    id: integer("id").primaryKey(),
    orderId: orderId(),
    body: text("body").notNull(),
    visibility: text("visibility", { enum: ["internal", "customer"] }).notNull(),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    // no FK in the catalog
    authorId: integer("author_id").notNull(),
    authorName: text("author_name").notNull(),
    createdAt: createdAt(),
    editedAt: integer("edited_at"),
    deletedAt: integer("deleted_at"),
  },
  (t) => [
    // pinned on top, the rest newest first
    index("order_notes_order_idx").on(t.orderId, sql`${t.pinned} DESC`, sql`${t.createdAt} DESC`),
    check("order_notes_body_ck", sql`length(${t.body}) <= 5000`),
    check("order_notes_visibility_ck", sql`${t.visibility} IN ('internal', 'customer')`),
  ],
)

// knowing ord_ is not enough; token (otk_) is only a SHA-256 digest; on rotation the old one gets revoked_at
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
