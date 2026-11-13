import { outbox } from "@openmers/db"
import { type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, guardedInsertStatement } from "../../../platform"
import { outboxValues } from "../../outbox/enqueueStatement"
import { reindexJob } from "./statements"

/**
 * `reindex` job for the variant's product; the product's `public_id` is resolved via a subquery (price/stock
 * writes know the variant, not the product). If the same product job is pending, no new one is added (`dedupe_key`).
 * If `guard` does not hold (e.g. the bucket did not change), no row is written.
 */
export function reindexForVariantStatement(
  variantId: SQL,
  now: number,
  guard: SQL,
  requestId?: string,
): AtomicStatement {
  const product = sql`(SELECT p."public_id" FROM "products" p
    JOIN "product_variants" v ON v."product_id" = p."id" WHERE v."id" = ${variantId})`
  const stmt = guardedInsertStatement(
    outbox,
    {
      ...outboxValues(reindexJob("", requestId), now),
      payload: sql`json_object('product', ${product})`,
      dedupeKey: sql`'product:' || ${product}`,
    },
    guard,
  )
  return { ...stmt, sql: `${stmt.sql} on conflict do nothing` }
}
