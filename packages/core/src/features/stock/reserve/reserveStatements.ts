import { type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, sqlStatement } from "../../../platform"
import { StockError, type StockLine, type StockRef } from "../types"

/**
 * Stock operation statements (04-stok §2). Added to another `atomic()` (checkout reservation,
 * shipment); they do not write on their own.
 *
 * **All or nothing, without throwing.** Each operation is two statements: a single `UPDATE stock_levels` and a single
 * `INSERT stock_movements ... SELECT ... WHERE G`. `G` combines the condition of all lines in a single `NOT EXISTS`
 * subquery and is not tied to the outer row: it is evaluated once per statement, before any rows
 * change. If even one line fails, both statements return 0 rows; if all hold, both return the
 * (summed) line count. If lines were split into separate `UPDATE`s, the first line's write would
 * change the condition of the next ones; hence a single statement.
 *
 * Both statements must see the same `G`: the first statement does not touch the table `G` reads. In `reserve`, `G`
 * only reads `stock_levels` (sellable) → movement first, then `UPDATE`. In `release`/`commit`,
 * `G` only reads `stock_movements` (the reference has a reservation, no release/commit: double release
 * is impossible) → `UPDATE` first, then movement. In these, if `reserved`/`on_hand` goes negative (inconsistent
 * data) `stock_levels_counts_ck` fails and the whole batch is rolled back.
 * The caller checks the count of the last statement; it binds its own rows with `stockOpGuard`, **before**
 * these statements, to the same condition.
 *
 * Ids and quantities are validated safe integers and are embedded in SQL as **literals**: so that D1's
 * per-statement bound parameter limit (100) does not cap the line count (no injection,
 * only values passing `Number.isSafeInteger`).
 */
export type StockOp = "reserve" | "release" | "commit"

type OpSpec = { kind: string; sign: 1 | -1; set: string; ref: boolean }

const OPS: Record<StockOp, OpSpec> = {
  // Reserve if sellable (`on_hand − reserved − safety`) suffices.
  reserve: { kind: "reservation", sign: 1, set: `"reserved" = "reserved" + {n}`, ref: false },
  release: { kind: "release", sign: -1, set: `"reserved" = "reserved" - {n}`, ref: true },
  // Subtract the reserved amount from on-hand (shipment).
  commit: {
    kind: "sale",
    sign: -1,
    set: `"reserved" = "reserved" - {n}, "on_hand" = "on_hand" - {n}`,
    ref: true,
  },
}

/** Lines for the same (variant, warehouse) are summed; two conditions are not written for one row. */
function aggregate(lines: readonly StockLine[]): StockLine[] {
  if (lines.length === 0) throw new StockError("INVALID_INPUT", "kalem yok")
  const byKey = new Map<string, StockLine>()
  for (const line of lines) {
    for (const value of [line.variantId, line.locationId, line.quantity]) {
      if (!Number.isSafeInteger(value) || value < 1) {
        throw new StockError("INVALID_INPUT", "kimlik ve adet pozitif tamsayı olmalı")
      }
    }
    const key = `${line.variantId}:${line.locationId}`
    const prev = byKey.get(key)
    const quantity = (prev?.quantity ?? 0) + line.quantity
    if (!Number.isSafeInteger(quantity)) throw new StockError("INVALID_INPUT", "adet çok büyük")
    byKey.set(key, { ...line, quantity })
  }
  return [...byKey.values()]
}

function requestTable(lines: readonly StockLine[]): string {
  const rows = lines.map((l) => `(${l.variantId}, ${l.locationId}, ${l.quantity})`).join(", ")
  return `(SELECT column1 AS variant_id, column2 AS location_id, column3 AS n FROM (VALUES ${rows}))`
}

function refMovement(ref: StockRef, kinds: string): SQL {
  return sql`EXISTS (SELECT 1 FROM "stock_movements" m
    WHERE m."ref_type" = ${ref.type} AND m."ref_id" = ${ref.id} AND m."kind" IN (${sql.raw(kinds)})
      AND m."variant_id" = req.variant_id AND m."location_id" = req.location_id)`
}

/** Whether all lines hold; not tied to the outer row (evaluated once). */
function allHold(op: StockOp, lines: readonly StockLine[], ref: StockRef): SQL {
  const holds = OPS[op].ref
    ? sql`${refMovement(ref, "'reservation'")} AND NOT ${refMovement(ref, "'release', 'sale'")}`
    : sql`s."on_hand" - s."reserved" - s."safety" >= req.n`
  return sql`NOT EXISTS (SELECT 1 FROM ${sql.raw(requestTable(lines))} AS req
    LEFT JOIN "stock_levels" s ON s."variant_id" = req.variant_id AND s."location_id" = req.location_id
    WHERE s."variant_id" IS NULL OR NOT (${holds}))`
}

function assertRef(ref: StockRef): void {
  if (typeof ref.id === "number" && (!Number.isSafeInteger(ref.id) || ref.id < 1)) {
    throw new StockError("INVALID_INPUT", "referans kimliği pozitif tamsayı olmalı")
  }
}

/** The same "all lines hold" condition for the caller's own conditional rows. */
export function stockOpGuard(op: StockOp, lines: readonly StockLine[], ref: StockRef): SQL {
  assertRef(ref)
  return allHold(op, aggregate(lines), ref)
}

/**
 * Two statements; each affects either the aggregated line count or 0 (order per op, see above).
 * `extra`: the caller's additional condition (e.g. "reservation still `active`"); both statements
 * are bound to it, so it must only read tables neither statement writes.
 */
export function stockOpStatements(
  op: StockOp,
  lines: readonly StockLine[],
  ref: StockRef,
  now: number,
  extra?: SQL,
): AtomicStatement[] {
  assertRef(ref)
  const items = aggregate(lines)
  const spec = OPS[op]
  const req = requestTable(items)
  const holds = allHold(op, items, ref)
  const guard = extra ? sql`${holds} AND (${extra})` : holds
  const n = `(SELECT req.n FROM ${req} AS req
    WHERE req.variant_id = "stock_levels"."variant_id" AND req.location_id = "stock_levels"."location_id")`
  const movement = sqlStatement(sql`INSERT INTO "stock_movements"
      ("variant_id", "location_id", "kind", "quantity", "units", "ref_type", "ref_id", "created_at")
      SELECT req.variant_id, req.location_id, ${spec.kind}, ${spec.sign} * req.n, ${spec.sign} * req.n,
        ${ref.type}, ${ref.id}, ${now}
      FROM ${sql.raw(req)} AS req WHERE ${guard}`)
  const update = sqlStatement(sql`UPDATE "stock_levels"
      SET ${sql.raw(spec.set.replaceAll("{n}", n))}, "version" = "version" + 1, "updated_at" = ${now}
      WHERE ("variant_id", "location_id") IN (SELECT variant_id, location_id FROM ${sql.raw(req)})
        AND ${guard}`)
  return spec.ref ? [update, movement] : [movement, update]
}

type OpArgs = [lines: readonly StockLine[], ref: StockRef, now: number, extra?: SQL]

export const reserveStatements = (...args: OpArgs) => stockOpStatements("reserve", ...args)
export const releaseStatements = (...args: OpArgs) => stockOpStatements("release", ...args)
export const commitStatements = (lines: readonly StockLine[], ref: StockRef, now: number) =>
  stockOpStatements("commit", lines, ref, now)
