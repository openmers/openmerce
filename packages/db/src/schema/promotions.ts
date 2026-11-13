import { sql } from "drizzle-orm"
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { checkoutReservations } from "./cart"
import { createdAt, publicId, updatedAt } from "./columns"
import { customers } from "./customers"
import { orders } from "./orders"

// 02-ticaret.md bölüm 9, 0012. `promotion_usage.reservation_id` (0013) ve `order_id` (0015) ileri
// FK'dır: SQLite FK hedefini CREATE'te denetlemez (02 B7); 0013'ten önce kullanım satırı yazılmaz.
// Etkin promosyonlar kanal başına bellekte; `promotion_channels` katalogda tanımsız, açılmadı.

type Rules = { code: string; args: Record<string, unknown> }[]

export const promotions = sqliteTable(
  "promotions",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    name: text("name").notNull(),
    startsAt: integer("starts_at"),
    endsAt: integer("ends_at"),
    enabled: integer("enabled", { mode: "boolean" }).notNull(),
    priority: integer("priority").notNull(),
    couponCode: text("coupon_code"),
    // NULL = sınırsız
    usageLimit: integer("usage_limit"),
    perCustomerLimit: integer("per_customer_limit"),
    // `used = used + 1 WHERE usage_limit IS NULL OR used < usage_limit`; version'a dokunmaz
    used: integer("used").notNull().default(0),
    conditions: text("conditions", { mode: "json" }).$type<Rules>().notNull(),
    actions: text("actions", { mode: "json" }).$type<Rules>().notNull(),
    stackable: integer("stackable", { mode: "boolean" }).notNull(),
    applyToContract: integer("apply_to_contract", { mode: "boolean" }).notNull().default(false),
    version: integer("version").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("promotions_public_id_uq").on(t.publicId),
    // kupon kodu mağaza genelinde tek promosyonu gösterir
    uniqueIndex("promotions_coupon_code_uq")
      .on(t.couponCode)
      .where(sql`${t.couponCode} IS NOT NULL`),
    check("promotions_used_ck", sql`${t.used} >= 0`),
    check(
      "promotions_limits_ck",
      sql`(${t.usageLimit} IS NULL OR ${t.usageLimit} >= 0) AND (${t.perCustomerLimit} IS NULL OR ${t.perCustomerLimit} >= 0)`,
    ),
    check("promotions_conditions_ck", sql`json_type(${t.conditions}) = 'array'`),
    check("promotions_actions_ck", sql`json_type(${t.actions}) = 'array'`),
  ],
)

// rezervasyonda yazılır, bırakmada silinir; 0 indirimde satır yok
export const promotionUsage = sqliteTable(
  "promotion_usage",
  {
    id: integer("id").primaryKey(),
    promotionId: integer("promotion_id")
      .notNull()
      .references(() => promotions.id),
    // bilinmiyorsa müşteri başına sınır uygulanmaz
    customerId: integer("customer_id").references(() => customers.id),
    reservationId: integer("reservation_id")
      .notNull()
      .references(() => checkoutReservations.id),
    // settlement'ta doldurulur
    orderId: integer("order_id").references(() => orders.id),
    createdAt: createdAt(),
  },
  (t) => [
    index("promotion_usage_customer_idx").on(t.promotionId, t.customerId),
    uniqueIndex("promotion_usage_reservation_uq").on(t.promotionId, t.reservationId),
  ],
)
