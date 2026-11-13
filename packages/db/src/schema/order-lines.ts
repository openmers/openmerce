import { sql } from "drizzle-orm"
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { productVariants } from "./catalog-products"
import { publicId } from "./columns"
import { orders } from "./orders"
import { promotions } from "./promotions"
import { stockLocations } from "./stock"
import { shippingMethods } from "./tax-shipping"

// 02-ticaret.md bölüm 8 (sipariş satırları, indirim, vergi, kargo satırları), 0015. Anlık görüntü;
// satır yerinde düzenlenmez (tek istisna: ek ücreti değiştirmeyen kişiselleştirme düzeltmesi).
// Katalog bu tablolara created_at/updated_at vermez; sipariş satırının zamanı orders.placed_at.

const orderId = () =>
  integer("order_id")
    .notNull()
    .references(() => orders.id)
const orderLineId = () => integer("order_line_id").references(() => orderLines.id)

export const orderLines = sqliteTable(
  "order_lines",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    orderId: orderId(),
    // referans; ad ve sku kopyadır
    variantId: integer("variant_id")
      .notNull()
      .references(() => productVariants.id),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    unitPriceNet: integer("unit_price_net").notNull(),
    unitPriceGross: integer("unit_price_gross").notNull(),
    // ek ücret öncesi
    baseUnitPrice: integer("base_unit_price").notNull(),
    // kişiselleştirme ek ücreti
    surcharge: integer("surcharge").notNull().default(0),
    quantity: integer("quantity").notNull(),
    // adet × unit_factor
    stockUnits: integer("stock_units").notNull(),
    locationId: integer("location_id").references(() => stockLocations.id),
    personalization: text("personalization", { mode: "json" }).$type<Record<string, unknown>>(),
    fulfillmentType: text("fulfillment_type", { enum: ["physical", "digital"] })
      .notNull()
      .default("physical"),
    customizesGoods: integer("customizes_goods", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [
    uniqueIndex("order_lines_public_id_uq").on(t.publicId),
    index("order_lines_order_idx").on(t.orderId),
    index("order_lines_variant_idx").on(t.variantId),
    check("order_lines_quantity_ck", sql`${t.quantity} > 0`),
    check("order_lines_fulfillment_type_ck", sql`${t.fulfillmentType} IN ('physical', 'digital')`),
    check(
      "order_lines_amounts_ck",
      sql`typeof(${t.unitPriceNet}) = 'integer' AND typeof(${t.unitPriceGross}) = 'integer' AND typeof(${t.baseUnitPrice}) = 'integer' AND typeof(${t.surcharge}) = 'integer'`,
    ),
  ],
)

// sipariş düzeyi indirim satırlara oransal dağıtılır
export const orderAdjustments = sqliteTable(
  "order_adjustments",
  {
    id: integer("id").primaryKey(),
    orderId: orderId(),
    // boşsa sipariş ya da kargo düzeyi
    orderLineId: orderLineId(),
    source: text("source", { enum: ["promotion", "coupon", "manual"] }).notNull(),
    promotionId: integer("promotion_id").references(() => promotions.id),
    amount: integer("amount").notNull(),
    target: text("target", { enum: ["line", "order", "shipping"] }).notNull(),
    // promosyon/kupon adı kopyası
    description: text("description"),
  },
  (t) => [
    index("order_adjustments_order_idx").on(t.orderId),
    check("order_adjustments_source_ck", sql`${t.source} IN ('promotion', 'coupon', 'manual')`),
    check("order_adjustments_target_ck", sql`${t.target} IN ('line', 'order', 'shipping')`),
    check(
      "order_adjustments_line_ck",
      sql`(${t.target} = 'line') = (${t.orderLineId} IS NOT NULL)`,
    ),
    check("order_adjustments_amount_ck", sql`typeof(${t.amount}) = 'integer'`),
  ],
)

// order_line_id boşsa kargo vergisi; yuvarlama satır düzeyinde
export const orderTaxLines = sqliteTable(
  "order_tax_lines",
  {
    id: integer("id").primaryKey(),
    orderId: orderId(),
    orderLineId: orderLineId(),
    rateBp: integer("rate_bp").notNull(),
    amount: integer("amount").notNull(),
    // kategori kodu kopyası; dış vergi servisinde boş
    taxCategory: text("tax_category"),
  },
  (t) => [
    index("order_tax_lines_order_idx").on(t.orderId),
    check("order_tax_lines_rate_ck", sql`typeof(${t.rateBp}) = 'integer' AND ${t.rateBp} >= 0`),
    check("order_tax_lines_amount_ck", sql`typeof(${t.amount}) = 'integer'`),
  ],
)

// v1'de sipariş başına tek kargo satırı
export const orderShippingLines = sqliteTable(
  "order_shipping_lines",
  {
    id: integer("id").primaryKey(),
    orderId: orderId(),
    shippingMethodId: integer("shipping_method_id").references(() => shippingMethods.id),
    methodName: text("method_name").notNull(),
    // fiyatlanan ağırlık
    weight: integer("weight"),
    amount: integer("amount").notNull(),
  },
  (t) => [
    index("order_shipping_lines_order_idx").on(t.orderId),
    check(
      "order_shipping_lines_amount_ck",
      sql`typeof(${t.amount}) = 'integer' AND ${t.amount} >= 0`,
    ),
  ],
)
