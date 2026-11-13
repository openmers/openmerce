import { affected, type Platform } from "../../../platform"
import { StockError, type StockLine, type StockRef } from "../types"
import { commitStatements, releaseStatements, reserveStatements } from "./reserveStatements"

type Atomic = Pick<Platform, "atomic">

async function run(p: Atomic, stmts: ReturnType<typeof reserveStatements>): Promise<boolean> {
  const result = await p.atomic(stmts)
  return affected(result, stmts.length - 1)
}

/** Reserves all lines or none; `INSUFFICIENT_STOCK` if short (no rows written). */
export async function reserveStock(
  p: Atomic,
  lines: readonly StockLine[],
  ref: StockRef,
  now: number,
): Promise<void> {
  if (!(await run(p, reserveStatements(lines, ref, now)))) {
    throw new StockError("INSUFFICIENT_STOCK", "stok yetersiz")
  }
}

/** Releases the reference's reservation; no effect (`false`) if already released/committed. */
export async function releaseStock(
  p: Atomic,
  lines: readonly StockLine[],
  ref: StockRef,
  now: number,
): Promise<boolean> {
  return run(p, releaseStatements(lines, ref, now))
}

/** Subtracts the reserved amount from on-hand (`sale` movement); no effect (`false`) if there is no reservation or it was released. */
export async function commitStock(
  p: Atomic,
  lines: readonly StockLine[],
  ref: StockRef,
  now: number,
): Promise<boolean> {
  return run(p, commitStatements(lines, ref, now))
}
