import { type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, sqlStatement } from "../../../platform"

export type UsageInput = {
  /** `applyPromotions` results; only `effective` ones consume the counter. */
  results: readonly { promotionId: number; effective: boolean }[]
  /** The reservation written in the same `atomic()`: its id or a subquery yielding the id. */
  reservationId: number | SQL
  /** If unknown, the per-customer limit is not applied. */
  customerId: number | null
  now: number
}

export type UsageStatements = {
  /** `[INSERT promotion_usage, UPDATE promotions]`; empty if there is no effective promotion. */
  statements: AtomicStatement[]
  /** Number of rows the first statement must hit (the number of effective promotions). */
  expected: number
  /** The same "all limits hold" condition for the caller's own conditional rows. */
  guard: SQL
}

function assertId(value: number, what: string): void {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${what} pozitif tamsayı olmalı`)
}

/**
 * Usage statements for the reservation `atomic()` (08-promosyon §3, 02-ticaret `promotion_usage`).
 * **All or nothing, without throwing** (same pattern as stock reservation): `G` combines the condition of all
 * effective promotions (reservation `active`, `usage_limit IS NULL OR used < usage_limit`,
 * per-customer limit) into a single subquery not tied to the outer row; `INSERT ... SELECT ...
 * WHERE G` is evaluated once and writes either one row per promotion or none. Then
 * `used + 1` only increments on promotions that have a usage row for this reservation: if the first statement wrote 0 rows
 * the second writes 0 too. A second call for the same reservation hits the unique `(promotion_id,
 * reservation_id)` index and the whole `atomic()` is rolled back (no double counting).
 *
 * Per-customer limit: `count(promotion_usage WHERE customer_id) < per_customer_limit`, inside the same
 * `G` (02-ticaret decision). Counted rows are open reservations + those turned into orders;
 * a released reservation's row is deleted, so it is not counted.
 */
export function buildUsageStatements(input: UsageInput): UsageStatements {
  const ids = [...new Set(input.results.filter((r) => r.effective).map((r) => r.promotionId))]
  ids.forEach((id) => {
    assertId(id, "promosyon kimliği")
  })
  if (typeof input.reservationId === "number") assertId(input.reservationId, "rezervasyon kimliği")
  if (input.customerId !== null) assertId(input.customerId, "müşteri kimliği")
  if (ids.length === 0) return { statements: [], expected: 0, guard: sql`1 = 1` }

  const idList = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )
  const res = input.reservationId
  const customer = input.customerId
  const perCustomer =
    customer === null
      ? sql`1 = 1`
      : sql`(g."per_customer_limit" IS NULL OR (SELECT count(*) FROM "promotion_usage" u
          WHERE u."promotion_id" = g."id" AND u."customer_id" = ${customer}) < g."per_customer_limit")`
  const guard = sql`EXISTS (SELECT 1 FROM "checkout_reservations" r
      WHERE r."id" = ${res} AND r."status" = 'active')
    AND (SELECT count(*) FROM "promotions" g WHERE g."id" IN (${idList})
      AND (g."usage_limit" IS NULL OR g."used" < g."usage_limit") AND ${perCustomer}) = ${ids.length}`

  const insert = sqlStatement(sql`INSERT INTO "promotion_usage"
      ("promotion_id", "customer_id", "reservation_id", "created_at")
      SELECT src."id", ${customer}, ${res}, ${input.now} FROM "promotions" src
      WHERE src."id" IN (${idList}) AND ${guard}`)
  const update = sqlStatement(sql`UPDATE "promotions" SET "used" = "used" + 1
      WHERE "id" IN (${idList}) AND EXISTS (SELECT 1 FROM "promotion_usage" u
        WHERE u."promotion_id" = "promotions"."id" AND u."reservation_id" = ${res})`)
  return { statements: [insert, update], expected: ids.length, guard }
}

/**
 * Inverse statements on release: `used − 1` only on promotions with a usage row for this reservation (not
 * turned into an order), then the rows are deleted. A second release has no effect (no rows left).
 */
export function buildReleaseUsageStatements(reservationId: number | SQL): AtomicStatement[] {
  if (typeof reservationId === "number") assertId(reservationId, "rezervasyon kimliği")
  const mine = sql`"promotion_usage" u WHERE u."reservation_id" = ${reservationId}
    AND u."order_id" IS NULL`
  return [
    sqlStatement(sql`UPDATE "promotions" SET "used" = "used" - 1
      WHERE "id" IN (SELECT u."promotion_id" FROM ${mine})`),
    sqlStatement(sql`DELETE FROM "promotion_usage" WHERE "id" IN (SELECT u."id" FROM ${mine})`),
  ]
}
