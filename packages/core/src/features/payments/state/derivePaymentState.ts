import type { orderPaymentStatuses, paymentStates } from "@openmers/db"
import { type SQL, sql } from "drizzle-orm"

export type OrderPaymentStatus = (typeof orderPaymentStatuses)[number]
export type PaymentState = (typeof paymentStates)[number]

export type PaymentFacts = {
  state: PaymentState
  amount: number
  /** Provider refunded (absolute) + external refunded (additive). */
  refunded: number
}

/**
 * Order payment status from its payments (06-odeme §4, pure). Only `settled` money can be
 * refunded; a fully refunded order is `refunded` even if it was never fully paid. `paymentStatusSql`
 * is the SQL twin and must stay in step with this function.
 */
export function derivePaymentState(
  total: number,
  payments: readonly PaymentFacts[],
): OrderPaymentStatus {
  let settled = 0
  let authorized = 0
  let refunded = 0
  for (const p of payments) {
    if (p.state === "settled") {
      settled += p.amount
      refunded += p.refunded
    } else if (p.state === "authorized") authorized += p.amount
  }
  if (settled > 0 && refunded >= settled) return "refunded"
  if (refunded > 0) return "partially_refunded"
  if (settled > 0 && settled >= total) return "paid"
  if (authorized > 0 && settled + authorized >= total) return "authorized"
  return "awaiting"
}

/** Same rules over the `payments` rows of `orderId` (a number or a subquery). */
export function paymentStatusSql(orderId: number | SQL): SQL {
  return sql`(SELECT CASE
      WHEN s > 0 AND r >= s THEN 'refunded'
      WHEN r > 0 THEN 'partially_refunded'
      WHEN s > 0 AND s >= t THEN 'paid'
      WHEN a > 0 AND s + a >= t THEN 'authorized'
      ELSE 'awaiting' END
    FROM (SELECT
      coalesce(sum(CASE WHEN "state" = 'settled' THEN "amount" END), 0) AS s,
      coalesce(sum(CASE WHEN "state" = 'authorized' THEN "amount" END), 0) AS a,
      coalesce(sum(CASE WHEN "state" = 'settled'
        THEN "refunded_amount" + "external_refunded_amount" END), 0) AS r,
      (SELECT "total_gross" FROM "orders" WHERE "id" = ${orderId}) AS t
      FROM "payments" WHERE "order_id" = ${orderId}))`
}
