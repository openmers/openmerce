import { sql } from "drizzle-orm"
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { productVariants } from "./catalog-products"
import { channels } from "./channels"
import { createdAt, publicId, updatedAt } from "./columns"
import { customers } from "./customers"
import { paymentMethods } from "./payments"
import { shippingMethods } from "./tax-shipping"

// 02-ticaret.md section 6, 0013. Carts store no totals and are hard-deleted on expiry; orders
// rely on the checkout reservation snapshot. `checkout_reservations.payment_method_id` (0014) is a
// forward FK; `carts.company_id` target is 0023: no FK.

type Json = Record<string, unknown>

export const cartStatuses = ["active", "awaiting_approval", "closed"] as const
export const reservationStatuses = [
  "active",
  "payment_pending",
  "settled",
  "released",
  "expired",
  "failed",
] as const
export const commerceSources = ["web", "agent", "admin", "api"] as const

export const carts = sqliteTable(
  "carts",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    customerId: integer("customer_id").references(() => customers.id),
    companyId: integer("company_id"),
    // B2B named cart
    name: text("name"),
    status: text("status", { enum: cartStatuses }).notNull().default("active"),
    currency: text("currency").notNull(),
    // generic address keys (address_line1/2, city, region, district?, postal_code, country_code;
    // on invoices tax_id, tax_id_type); guest address is not a table row
    shippingAddress: text("shipping_address", { mode: "json" }).$type<Json>(),
    billingAddress: text("billing_address", { mode: "json" }).$type<Json>(),
    shippingMethodId: integer("shipping_method_id").references(() => shippingMethods.id),
    couponCodes: text("coupon_codes", { mode: "json" }).$type<string[]>(),
    // required for digital and guest checkout (checkout validation)
    email: text("email"),
    version: integer("version").notNull().default(0),
    expiresAt: integer("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("carts_public_id_uq").on(t.publicId),
    index("carts_customer_status_idx").on(t.customerId, t.status),
    index("carts_company_status_idx").on(t.companyId, t.status),
    index("carts_expires_idx").on(t.expiresAt),
    check("carts_status_ck", sql`${t.status} IN ('active', 'awaiting_approval', 'closed')`),
    check("carts_currency_ck", sql`length(${t.currency}) = 3`),
  ],
)

// insert is a single conditional write (ON CONFLICT ... DO UPDATE); edit is "delete + insert"
export const cartLines = sqliteTable(
  "cart_lines",
  {
    id: integer("id").primaryKey(),
    cartId: integer("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: integer("variant_id")
      .notNull()
      .references(() => productVariants.id),
    quantity: integer("quantity").notNull(),
    // not part of line_key
    customFields: text("custom_fields", { mode: "json" }).$type<Json>(),
    personalization: text("personalization", { mode: "json" }).$type<Json>(),
    // first 16 bytes of the canonical personalization JSON's SHA-256 (32 lowercase hex); '' if none
    lineKey: text("line_key").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("cart_lines_uq").on(t.cartId, t.variantId, t.lineKey),
    check("cart_lines_quantity_ck", sql`${t.quantity} > 0`),
    check(
      "cart_lines_line_key_ck",
      sql`length(${t.lineKey}) IN (0, 32) AND ${t.lineKey} NOT GLOB '*[^0-9a-f]*'`,
    ),
  ],
)

// INSERT ... SELECT ... WHERE <lines sufficient> AND <cart version unchanged>; transitions
// `WHERE status = :expected` (no version). settled is not deleted; released/expired/failed after 30 days.
export const checkoutReservations = sqliteTable(
  "checkout_reservations",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    // no FK: the cart is hard-deleted, the reservation stays
    cartId: integer("cart_id").notNull(),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    // lines, prices, discount, tax, shipping, addresses, stock allocation, attribution data
    snapshot: text("snapshot", { mode: "json" }).$type<Json>().notNull(),
    paymentMethodId: integer("payment_method_id")
      .notNull()
      .references(() => paymentMethods.id),
    status: text("status", { enum: reservationStatuses }).notNull(),
    expiresAt: integer("expires_at").notNull(),
    source: text("source", { enum: commerceSources }).notNull().default("web"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("checkout_reservations_public_id_uq").on(t.publicId),
    // reconciliation and sweeping
    index("checkout_reservations_open_idx")
      .on(t.status, t.expiresAt)
      .where(sql`${t.status} IN ('active', 'payment_pending')`),
    index("checkout_reservations_cart_idx").on(t.cartId),
    index("checkout_reservations_purge_idx").on(t.status, t.updatedAt),
    check(
      "checkout_reservations_status_ck",
      sql`${t.status} IN ('active', 'payment_pending', 'settled', 'released', 'expired', 'failed')`,
    ),
    check("checkout_reservations_source_ck", sql`${t.source} IN ('web', 'agent', 'admin', 'api')`),
    check("checkout_reservations_snapshot_ck", sql`json_type(${t.snapshot}) = 'object'`),
  ],
)
