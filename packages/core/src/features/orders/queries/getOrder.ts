import { sql } from "drizzle-orm"
import { type Platform, sqlStatement } from "../../../platform"

export type OrderLineView = {
  publicId: string
  name: string
  sku: string | null
  quantity: number
  unitPriceNet: number
  unitPriceGross: number
  personalization: Record<string, unknown> | null
}

export type OrderPaymentView = {
  publicId: string
  amount: number
  currency: string
  state: string
  refunded: number
}

export type OrderView = {
  publicId: string
  number: string
  state: string
  paymentStatus: string
  fulfillmentStatus: string
  currency: string
  subtotalNet: number
  taxTotal: number
  totalGross: number
  discountTotal: number
  shippingTotal: number
  stockException: boolean
  hasPersonalization: boolean
  placedAt: number
  lines: OrderLineView[]
  payments: OrderPaymentView[]
}

export type GetOrderInput = {
  orderPublicId: string
  channelId: number
  /** Shop: the session customer; another customer's order reads as missing. */
  customerId?: number
}

const json = (v: unknown) =>
  typeof v === "string" ? (JSON.parse(v) as Record<string, unknown>) : null

/**
 * Order detail in one `batch` (order, lines, payments). Every query carries the same channel (and
 * customer) filter, so an order outside it is `null`, never a partial read.
 */
export async function getOrder(
  p: Pick<Platform, "batch">,
  input: GetOrderInput,
): Promise<OrderView | null> {
  const owner =
    input.customerId === undefined ? sql`1 = 1` : sql`o."customer_id" = ${input.customerId}`
  const scope = sql`o."public_id" = ${input.orderPublicId} AND o."channel_id" = ${input.channelId}
    AND ${owner}`
  const [orders = [], lines = [], payments = []] = await p.batch([
    sqlStatement(sql`SELECT o.* FROM "orders" o WHERE ${scope}`),
    sqlStatement(sql`SELECT l."public_id", l."name", l."sku", l."quantity", l."unit_price_net",
        l."unit_price_gross", l."personalization"
      FROM "order_lines" l JOIN "orders" o ON o."id" = l."order_id" WHERE ${scope} ORDER BY l."id"`),
    sqlStatement(sql`SELECT p."public_id", p."amount", p."currency", p."state",
        p."refunded_amount" + p."external_refunded_amount" AS "refunded"
      FROM "payments" p JOIN "orders" o ON o."id" = p."order_id" WHERE ${scope} ORDER BY p."id"`),
  ])
  const o = orders[0]
  if (!o) return null
  return {
    publicId: String(o.public_id),
    number: String(o.number),
    state: String(o.state),
    paymentStatus: String(o.payment_status),
    fulfillmentStatus: String(o.fulfillment_status),
    currency: String(o.currency),
    subtotalNet: Number(o.subtotal_net),
    taxTotal: Number(o.tax_total),
    totalGross: Number(o.total_gross),
    discountTotal: Number(o.discount_total),
    shippingTotal: Number(o.shipping_total),
    stockException: Number(o.stock_exception) === 1,
    hasPersonalization: Number(o.has_personalization) === 1,
    placedAt: Number(o.placed_at),
    lines: lines.map((l) => ({
      publicId: String(l.public_id),
      name: String(l.name),
      sku: l.sku == null ? null : String(l.sku),
      quantity: Number(l.quantity),
      unitPriceNet: Number(l.unit_price_net),
      unitPriceGross: Number(l.unit_price_gross),
      personalization: json(l.personalization),
    })),
    payments: payments.map((r) => ({
      publicId: String(r.public_id),
      amount: Number(r.amount),
      currency: String(r.currency),
      state: String(r.state),
      refunded: Number(r.refunded),
    })),
  }
}
