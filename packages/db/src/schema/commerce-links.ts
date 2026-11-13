import { index, integer, primaryKey, sqliteTable } from "drizzle-orm/sqlite-core"
import { channels } from "./channels"
import { createdAt, updatedAt } from "./columns"
import { paymentMethods } from "./payments"
import { promotions } from "./promotions"
import { shippingMethods } from "./tax-shipping"

// 0017: the three channel links named in the catalog but never defined (02 Audit B, `<entity>_channels`
// pattern: two-column PK + `(channel_id, …)` reverse index) and the order number counter (07 section 6).

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
 * Gap-free sequence per channel + period. Taken inside settlement's `atomic()`
 * with `INSERT … ON CONFLICT DO UPDATE SET last_value = last_value + 1`; the period depends on
 * the strategy (default year, e.g. 2026; a periodless strategy writes 0). Rows are never deleted.
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
