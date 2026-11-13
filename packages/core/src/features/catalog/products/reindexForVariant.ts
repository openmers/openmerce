import { outbox } from "@openmers/db"
import { type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, guardedInsertStatement } from "../../../platform"
import { outboxValues } from "../../outbox/enqueueStatement"
import { reindexJob } from "./statements"

/**
 * Varyantın ürünü için `reindex` işi; ürün `public_id`'si alt sorguyla çözülür (fiyat/stok
 * yazımı varyant bilir, ürünü okumaz). Bekleyen aynı ürün işi varsa yenisi eklenmez (`dedupe_key`).
 * `guard` tutmazsa (ör. kova değişmedi) satır yazılmaz.
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
