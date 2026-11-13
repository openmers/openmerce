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

// 02-ticaret.md bölüm 7, 0014. `payments.order_id`, `refunds.order_id` (0015) ve
// `refunds.return_id` (0016) ileri FK'dır (02 B7). Ödeme ve iade silinmez; webhook tekilliği
// settlement_token, (yöntem, sağlayıcı referansı) ve kümülatif refunded_amount koşuluyla.
// `payment_method_channels` katalogda tanımsız, açılmadı.

type Json = Record<string, unknown>

export const paymentStates = ["authorized", "settled", "declined", "cancelled"] as const
export const pendingPaymentStates = ["pending", "confirmed", "cancelled", "expired"] as const
export const refundStates = ["pending", "settled", "failed", "unknown"] as const
export const refundSources = ["admin", "provider", "manual"] as const

// küçük tablo, bellekte; sağlayıcı anahtarları kasada (`secrets`), satırda değil
export const paymentMethods = sqliteTable(
  "payment_methods",
  {
    id: integer("id").primaryKey(),
    // dışa açık kimlik (public_id yerine)
    code: text("code").notNull(),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    handlerCode: text("handler_code").notNull(),
    // sır içermez
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
    // elle kaydedilen (sağlayıcıya dokunmayan) iadelerin eklemeli toplamı
    externalRefundedAmount: integer("external_refunded_amount").notNull().default(0),
    // sağlayıcının bildirdiği kümülatif iade; `WHERE refunded_amount < :kümülatif`
    refundedAmount: integer("refunded_amount").notNull().default(0),
    statementDescriptor: text("statement_descriptor"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("payments_public_id_uq").on(t.publicId),
    index("payments_order_idx").on(t.orderId),
    // webhook eşlemesi ve çift kayıt engeli
    uniqueIndex("payments_provider_reference_uq")
      .on(t.paymentMethodId, t.providerReference)
      .where(sql`${t.providerReference} IS NOT NULL`),
    check(
      "payments_state_ck",
      sql`${t.state} IN ('authorized', 'settled', 'declined', 'cancelled')`,
    ),
    check("payments_currency_ck", sql`length(${t.currency}) = 3`),
    check("payments_amount_ck", sql`typeof(${t.amount}) = 'integer' AND ${t.amount} >= 0`),
    // iade üst sınırı; yazma yine `UPDATE ... WHERE` koşuluyla, check son savunma
    check(
      "payments_refunded_ck",
      sql`typeof(${t.refundedAmount}) = 'integer' AND typeof(${t.externalRefundedAmount}) = 'integer' AND ${t.refundedAmount} >= 0 AND ${t.externalRefundedAmount} >= 0 AND ${t.refundedAmount} + ${t.externalRefundedAmount} <= ${t.amount}`,
    ),
  ],
)

// havale/EFT ve kapıda ödeme; admin onayı rezervasyonun rsv_ kimliğiyle (public_id yok)
export const pendingPayments = sqliteTable(
  "pending_payments",
  {
    id: integer("id").primaryKey(),
    reservationId: integer("reservation_id")
      .notNull()
      .references(() => checkoutReservations.id),
    paymentMethodId: paymentMethodId(),
    // beklenen tutar
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    state: text("state", { enum: pendingPaymentStates }).notNull().default("pending"),
    // kapıda ödemede boş
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

// `unknown` yeniden denenmez (uzlaştırma, sonra admin); e-fatura iadesi outbox adımı
export const refunds = sqliteTable(
  "refunds",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    paymentId: integer("payment_id")
      .notNull()
      .references(() => payments.id),
    // ciro raporu ödeme join'i olmadan
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id),
    returnId: integer("return_id").references(() => returns.id),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    reason: text("reason"),
    state: text("state", { enum: refundStates }).notNull(),
    // satır dökümü; vergi satırlarına oransal dağıtım
    lines: text("lines", { mode: "json" }).$type<Json[]>(),
    source: text("source", { enum: refundSources }).notNull(),
    providerEventId: text("provider_event_id"),
    providerRefundId: text("provider_refund_id"),
    // yönetici iadesinde istemci anahtarı; sağlayıcıya da iletilir
    idempotencyKey: text("idempotency_key"),
    // ters kayıt; bir iade yalnız bir kez iptal edilir
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
    // uzlaştırma
    index("refunds_unknown_idx").on(t.state).where(sql`${t.state} = 'unknown'`),
    index("refunds_created_idx").on(t.createdAt),
    check("refunds_state_ck", sql`${t.state} IN ('pending', 'settled', 'failed', 'unknown')`),
    check("refunds_source_ck", sql`${t.source} IN ('admin', 'provider', 'manual')`),
    check("refunds_currency_ck", sql`length(${t.currency}) = 3`),
    check("refunds_amount_ck", sql`typeof(${t.amount}) = 'integer'`),
  ],
)
