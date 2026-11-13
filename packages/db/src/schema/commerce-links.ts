import { index, integer, primaryKey, sqliteTable } from "drizzle-orm/sqlite-core"
import { channels } from "./channels"
import { createdAt, updatedAt } from "./columns"
import { paymentMethods } from "./payments"
import { promotions } from "./promotions"
import { shippingMethods } from "./tax-shipping"

// 0017: katalogda adı geçip tanımı olmayan üç kanal bağlantısı (02 Denetim B, `<varlık>_channels`
// kalıbı: iki sütunlu PK + `(channel_id, …)` ters indeks) ve sipariş numarası sayacı (07 bölüm 6).

export const promotionChannels = sqliteTable(
  "promotion_channels",
  {
    promotionId: integer("promotion_id")
      .notNull()
      .references(() => promotions.id),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: "promotion_channels_pk", columns: [t.promotionId, t.channelId] }),
    index("promotion_channels_channel_idx").on(t.channelId, t.promotionId),
  ],
)

export const shippingMethodChannels = sqliteTable(
  "shipping_method_channels",
  {
    shippingMethodId: integer("shipping_method_id")
      .notNull()
      .references(() => shippingMethods.id),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({
      name: "shipping_method_channels_pk",
      columns: [t.shippingMethodId, t.channelId],
    }),
    index("shipping_method_channels_channel_idx").on(t.channelId, t.shippingMethodId),
  ],
)

export const paymentMethodChannels = sqliteTable(
  "payment_method_channels",
  {
    paymentMethodId: integer("payment_method_id")
      .notNull()
      .references(() => paymentMethods.id),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({
      name: "payment_method_channels_pk",
      columns: [t.paymentMethodId, t.channelId],
    }),
    index("payment_method_channels_channel_idx").on(t.channelId, t.paymentMethodId),
  ],
)

/**
 * Kanal + dönem başına boşluksuz sıra. Settlement `atomic()`'i içinde
 * `INSERT … ON CONFLICT DO UPDATE SET last_value = last_value + 1` ile alınır; dönem stratejiye
 * bağlıdır (varsayılan yıl, ör. 2026; dönemsiz strateji 0 yazar). Satır silinmez.
 */
export const orderNumberCounters = sqliteTable(
  "order_number_counters",
  {
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    period: integer("period").notNull(),
    lastValue: integer("last_value").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ name: "order_number_counters_pk", columns: [t.channelId, t.period] })],
)
