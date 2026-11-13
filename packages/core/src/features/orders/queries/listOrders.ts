import { sql } from "drizzle-orm"
import { type AtomicStatement, type Platform, sqlStatement } from "../../../platform"
import { OrderError, type OrderState } from "../types"

export type OrderSummary = {
  publicId: string
  number: string
  state: string
  paymentStatus: string
  fulfillmentStatus: string
  currency: string
  totalGross: number
  hasPersonalization: boolean
  placedAt: number
}

export type ListOrdersInput = {
  channelId: number
  /** Shop: own orders only (`orders_customer_placed_idx`); admin: whole channel. */
  customerId?: number
  state?: OrderState
  personalized?: boolean
  cursor?: string
  limit?: number
}

export const ORDER_PAGE_MAX = 100

type Cursor = [placedAt: number, id: number]

// base64url over UTF-8 with web APIs only (Workers and Node), same shape as the catalog cursor
function encode(c: Cursor): string {
  return btoa(JSON.stringify(c)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")
}

function decode(value: string): Cursor {
  try {
    const parsed: unknown = JSON.parse(atob(value.replaceAll("-", "+").replaceAll("_", "/")))
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      parsed.every((n) => Number.isSafeInteger(n))
    ) {
      return parsed as Cursor
    }
  } catch {}
  throw new OrderError("INVALID_INPUT", "invalid cursor")
}

/**
 * Newest first, keyset on `(placed_at, id)`: the customer list walks `orders_customer_placed_idx`,
 * the admin list `orders_channel_placed_idx` (no full scan, see the query plan test). State and
 * personalization filters narrow the index walk; `limit + 1` rows tell whether a next page exists.
 */
export function listOrdersQuery(input: ListOrdersInput): AtomicStatement {
  const limit = Math.min(Math.max(1, Math.trunc(input.limit ?? 50)), ORDER_PAGE_MAX)
  const where = [
    input.customerId !== undefined
      ? sql`"customer_id" = ${input.customerId} AND "channel_id" = ${input.channelId}`
      : sql`"channel_id" = ${input.channelId}`,
  ]
  if (input.state) where.push(sql`"state" = ${input.state}`)
  if (input.personalized !== undefined) {
    where.push(sql`"has_personalization" = ${input.personalized ? 1 : 0}`)
  }
  if (input.cursor) {
    const [at, id] = decode(input.cursor)
    where.push(sql`("placed_at" < ${at} OR ("placed_at" = ${at} AND "id" < ${id}))`)
  }
  return sqlStatement(sql`SELECT "id", "public_id", "number", "state", "payment_status",
      "fulfillment_status", "currency", "total_gross", "has_personalization", "placed_at"
    FROM "orders" WHERE ${sql.join(where, sql` AND `)}
    ORDER BY "placed_at" DESC, "id" DESC LIMIT ${limit + 1}`)
}

export async function listOrders(
  p: Pick<Platform, "batch">,
  input: ListOrdersInput,
): Promise<{ items: OrderSummary[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(1, Math.trunc(input.limit ?? 50)), ORDER_PAGE_MAX)
  const [rows = []] = await p.batch([listOrdersQuery(input)])
  const page = rows.slice(0, limit)
  const last = page[page.length - 1]
  return {
    items: page.map((r) => ({
      publicId: String(r.public_id),
      number: String(r.number),
      state: String(r.state),
      paymentStatus: String(r.payment_status),
      fulfillmentStatus: String(r.fulfillment_status),
      currency: String(r.currency),
      totalGross: Number(r.total_gross),
      hasPersonalization: Number(r.has_personalization) === 1,
      placedAt: Number(r.placed_at),
    })),
    nextCursor:
      rows.length > limit && last ? encode([Number(last.placed_at), Number(last.id)]) : null,
  }
}
