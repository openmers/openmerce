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
import { checkoutReservations } from "./cart"
import { createdAt, publicId, updatedAt } from "./columns"
import { returns } from "./fulfillment"
import { orders } from "./orders"

// 02-ticaret.md section 7, 0014. `payments.order_id`, `refunds.order_id` (0015) and
// `refunds.return_id` (0016) are forward FKs (02 B7). Payments and refunds are never deleted;
// webhook uniqueness via settlement_token, (method, provider reference) and cumulative refunded_amount.
// Channel link `payment_method_channels` in 0017 (`commerce-links.ts`).

type Json = Record<string, unknown>

export const paymentStates = ["authorized", "settled", "declined", "cancelled"] as const
export const pendingPaymentStates = ["pending", "confirmed", "cancelled", "expired"] as const
export const refundStates = ["pending", "settled", "failed", "unknown"] as const
export const refundSources = ["admin", "provider", "manual"] as const

// small table, in memory; provider keys live in the vault (`secrets`), not on the row
export const paymentMethods = sqliteTable(
  "payment_methods",
  {
    id: integer("id").primaryKey(),
    // externally visible id (instead of public_id)
    code: text("code").notNull(),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    handlerCode: text("handler_code").notNull(),
    // contains no secret
    handlerArgs: text("handler_args", { mode: "json" }).$type<Json>(),
    checkerCode: text("checker_code"),
    checkerArgs: text("checker_args", { mode: "json" }).$type<Json>(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("payment_methods_code_uq").on(t.code)],
)

const paymentMethodId = () =>
  integer("payment_method_id")
    .notNull()
    .references(() => paymentMethods.id)

export const payments = sqliteTable(
  "payments",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id),
    paymentMethodId: paymentMethodId(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    state: text("state", { enum: paymentStates }).notNull(),
    providerReference: text("provider_reference"),
    // additive total of manually recorded (provider-untouched) refunds
    externalRefundedAmount: integer("external_refunded_amount").notNull().default(0),
    // cumulative refund reported by the provider; `WHERE refunded_amount < :cumulative`
    refundedAmount: integer("refunded_amount").notNull().default(0),
    statementDescriptor: text("statement_descriptor"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("payments_public_id_uq").on(t.publicId),
    index("payments_order_idx").on(t.orderId),
    // webhook matching and double-write guard
    uniqueIndex("payments_provider_reference_uq")
      .on(t.paymentMethodId, t.providerReference)
      .where(sql`${t.providerReference} IS NOT NULL`),
    check(
      "payments_state_ck",
      sql`${t.state} IN ('authorized', 'settled', 'declined', 'cancelled')`,
    ),
    check("payments_currency_ck", sql`length(${t.currency}) = 3`),
    check("payments_amount_ck", sql`typeof(${t.amount}) = 'integer' AND ${t.amount} >= 0`),
    // refund upper bound; the write still uses `UPDATE ... WHERE`, check is the last defense
    check(
      "payments_refunded_ck",
      sql`typeof(${t.refundedAmount}) = 'integer' AND typeof(${t.externalRefundedAmount}) = 'integer' AND ${t.refundedAmount} >= 0 AND ${t.externalRefundedAmount} >= 0 AND ${t.refundedAmount} + ${t.externalRefundedAmount} <= ${t.amount}`,
    ),
  ],
)

// bank transfer/EFT and cash on delivery; admin approval via the reservation's rsv_ id (no public_id)
export const pendingPayments = sqliteTable(
  "pending_payments",
  {
    id: integer("id").primaryKey(),
    reservationId: integer("reservation_id")
      .notNull()
      .references(() => checkoutReservations.id),
    paymentMethodId: paymentMethodId(),
    // expected amount
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    state: text("state", { enum: pendingPaymentStates }).notNull().default("pending"),
    // empty for cash on delivery
    expiresAt: integer("expires_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("pending_payments_reservation_uq").on(t.reservationId),
    index("pending_payments_sweep_idx").on(t.expiresAt).where(sql`${t.state} = 'pending'`),
    check(
      "pending_payments_state_ck",
      sql`${t.state} IN ('pending', 'confirmed', 'cancelled', 'expired')`,
    ),
    check("pending_payments_currency_ck", sql`length(${t.currency}) = 3`),
    check("pending_payments_amount_ck", sql`typeof(${t.amount}) = 'integer' AND ${t.amount} >= 0`),
  ],
)

// `unknown` is not retried (reconciliation, then admin); e-invoice refund is an outbox step
export const refunds = sqliteTable(
  "refunds",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    paymentId: integer("payment_id")
      .notNull()
      .references(() => payments.id),
    // revenue report without joining payments
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id),
    returnId: integer("return_id").references(() => returns.id),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    reason: text("reason"),
    state: text("state", { enum: refundStates }).notNull(),
    // line breakdown; proportional allocation to tax lines
    lines: text("lines", { mode: "json" }).$type<Json[]>(),
    source: text("source", { enum: refundSources }).notNull(),
    providerEventId: text("provider_event_id"),
    providerRefundId: text("provider_refund_id"),
    // client key on admin refund; also forwarded to the provider
    idempotencyKey: text("idempotency_key"),
    // reversal entry; a refund is cancelled only once
    reversesRefundId: integer("reverses_refund_id").references((): AnySQLiteColumn => refunds.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("refunds_public_id_uq").on(t.publicId),
    index("refunds_payment_idx").on(t.paymentId),
    index("refunds_order_idx").on(t.orderId),
    uniqueIndex("refunds_provider_event_uq")
      .on(t.paymentId, t.providerEventId)
      .where(sql`${t.providerEventId} IS NOT NULL`),
    uniqueIndex("refunds_provider_refund_uq")
      .on(t.paymentId, t.providerRefundId)
      .where(sql`${t.providerRefundId} IS NOT NULL`),
    uniqueIndex("refunds_idempotency_key_uq")
      .on(t.idempotencyKey)
      .where(sql`${t.idempotencyKey} IS NOT NULL`),
    uniqueIndex("refunds_reverses_uq")
      .on(t.reversesRefundId)
      .where(sql`${t.reversesRefundId} IS NOT NULL`),
    // reconciliation
    index("refunds_unknown_idx").on(t.state).where(sql`${t.state} = 'unknown'`),
    index("refunds_created_idx").on(t.createdAt),
    check("refunds_state_ck", sql`${t.state} IN ('pending', 'settled', 'failed', 'unknown')`),
    check("refunds_source_ck", sql`${t.source} IN ('admin', 'provider', 'manual')`),
    check("refunds_currency_ck", sql`length(${t.currency}) = 3`),
    check("refunds_amount_ck", sql`typeof(${t.amount}) = 'integer'`),
  ],
)
