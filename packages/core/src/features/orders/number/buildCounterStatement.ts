import { type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, sqlStatement } from "../../../platform"
import { DEFAULT_ORDER_NUMBER, type OrderNumberFormat, orderNumberSql } from "./orderNumber"

export type CounterStatement = {
  /** `INSERT … ON CONFLICT DO UPDATE SET last_value = last_value + 1`, only when `when` holds. */
  statement: AtomicStatement
  /** The formatted number read back from the counter row (for the order `INSERT`). */
  number: SQL
}

/**
 * Settlement's counter step (07-siparis §6, `order_number_counters`). Gapless because it lives in
 * the same `atomic()` as the order insert: a rolled-back batch rolls the counter back too. `when`
 * must read the pre-state (e.g. "no order for this reservation yet").
 */
export function buildCounterStatement(input: {
  channelId: number
  period: number
  now: number
  when: SQL
  format?: OrderNumberFormat
}): CounterStatement {
  const { channelId, period, now } = input
  // the SELECT must keep its WHERE: SQLite's upsert-after-SELECT parsing rule
  const statement = sqlStatement(sql`INSERT INTO "order_number_counters"
      ("channel_id", "period", "last_value", "updated_at")
      SELECT ${channelId}, ${period}, 1, ${now} WHERE ${input.when}
      ON CONFLICT ("channel_id", "period")
      DO UPDATE SET "last_value" = "last_value" + 1, "updated_at" = excluded."updated_at"`)
  const seq = sql`(SELECT "last_value" FROM "order_number_counters"
    WHERE "channel_id" = ${channelId} AND "period" = ${period})`
  return { statement, number: orderNumberSql(period, seq, input.format ?? DEFAULT_ORDER_NUMBER) }
}
