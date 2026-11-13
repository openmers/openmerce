import { type SQL, sql } from "drizzle-orm"
import { OrderError } from "../types"

/** `orderNumber` strategy (07-siparis §6). Default: yearly sequence per channel, `2026-000001`. */
export type OrderNumberFormat = {
  prefix: string
  /** Zero-padded width of the sequence. */
  width: number
  /** `year`: counter restarts every UTC year; `none`: one counter (period 0). */
  period: "year" | "none"
}

export const DEFAULT_ORDER_NUMBER: OrderNumberFormat = { prefix: "", width: 6, period: "year" }

function assertFormat(f: OrderNumberFormat): void {
  if (!Number.isSafeInteger(f.width) || f.width < 1 || f.width > 12) {
    throw new OrderError("INVALID_INPUT", "width must be 1..12")
  }
  // `%` would be read as a printf directive by the SQL twin
  if (!/^[A-Za-z0-9_-]{0,16}$/.test(f.prefix)) {
    throw new OrderError("INVALID_INPUT", "prefix must be up to 16 [A-Za-z0-9_-] characters")
  }
}

/** Counter period for `now` (pure). */
export function numberPeriod(now: number, f: OrderNumberFormat = DEFAULT_ORDER_NUMBER): number {
  return f.period === "year" ? new Date(now).getUTCFullYear() : 0
}

/** Formats a sequence value (pure). Same output as `orderNumberSql`. */
export function orderNumber(
  period: number,
  seq: number,
  f: OrderNumberFormat = DEFAULT_ORDER_NUMBER,
): string {
  assertFormat(f)
  const head = period > 0 ? `${period}-` : ""
  return `${f.prefix}${head}${String(seq).padStart(f.width, "0")}`
}

/** SQL twin of `orderNumber`: the sequence is only known inside the settlement `atomic()`. */
export function orderNumberSql(
  period: number,
  seq: SQL,
  f: OrderNumberFormat = DEFAULT_ORDER_NUMBER,
): SQL {
  assertFormat(f)
  const head = period > 0 ? `${period}-` : ""
  return sql`${f.prefix + head} || printf(${`%0${f.width}d`}, ${seq})`
}
