import { type SQL, sql } from "drizzle-orm"
import type { AtomicStatement } from "../../../platform"
import { reserveStatements, type StockLine, type StockRef, stockOpGuard } from "../../stock"

export const LATE_RESERVATION_STATUSES = ["released", "expired", "failed"] as const

export type LateStock = {
  /** Order column value: 1 when the stock could not be reserved again (admin review). */
  stockException: SQL | false
  statements: AtomicStatement[]
}

/**
 * Payment after release (05-sepet §5): the order is still recorded, never swallowed. The released
 * stock is reserved again, conditionally and under the order (`ref_type = 'order'`: the
 * reservation's own movements already contain its release). If it does not fit, the order gets
 * `stock_exception = 1` and nothing is reserved. Coupon usage returned on release is not taken
 * back.
 */
export function lateStock(
  allocation: readonly StockLine[],
  orderId: SQL,
  won: SQL,
  now: number,
): LateStock {
  if (allocation.length === 0) return { stockException: false, statements: [] }
  const ref: StockRef = { type: "order", id: orderId }
  const fits = stockOpGuard("reserve", allocation, ref)
  const noException = sql`${won} AND EXISTS (SELECT 1 FROM "orders" WHERE "id" = ${orderId}
    AND "stock_exception" = 0)`
  return {
    stockException: sql`NOT (${fits})`,
    statements: reserveStatements(allocation, ref, now, noException),
  }
}
