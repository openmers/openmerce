import { type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, sqlStatement } from "../../../platform"
// direct file import: the payments index re-exports the webhook, which imports checkout, which
// imports this feature (index-to-index cycle)
import { paymentStatusSql } from "../../payments/state/derivePaymentState"

/**
 * Recomputes the cached `orders.payment_status` (07-siparis §2) from `payments`. Append it to the
 * `atomic()` of every payment/refund write, after those writes; it is idempotent. The fulfillment
 * column is left to the fulfillment feature (no derivation exists yet).
 */
export function refreshDerivedState(orderId: number | SQL, now: number): AtomicStatement {
  return sqlStatement(sql`UPDATE "orders" SET "payment_status" = ${paymentStatusSql(orderId)},
      "updated_at" = ${now} WHERE "id" = ${orderId}`)
}
