import { affected, type Platform } from "../../../platform"
import { StockError, type StockLine, type StockRef } from "../types"
import { commitStatements, releaseStatements, reserveStatements } from "./reserveStatements"

type Atomic = Pick<Platform, "atomic">

async function run(p: Atomic, stmts: ReturnType<typeof reserveStatements>): Promise<boolean> {
  const result = await p.atomic(stmts)
  return affected(result, stmts.length - 1)
}

/** Kalemlerin hepsini ayırır ya da hiçbirini; yetmezse `INSUFFICIENT_STOCK` (hiç satır yazılmaz). */
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

/** Referansın ayırmasını bırakır; zaten bırakılmış/düşülmüşse etkisiz (`false`). */
export async function releaseStock(
  p: Atomic,
  lines: readonly StockLine[],
  ref: StockRef,
  now: number,
): Promise<boolean> {
  return run(p, releaseStatements(lines, ref, now))
}

/** Ayrılanı eldekiden düşer (`sale` hareketi); ayırma yoksa ya da bırakılmışsa etkisiz (`false`). */
export async function commitStock(
  p: Atomic,
  lines: readonly StockLine[],
  ref: StockRef,
  now: number,
): Promise<boolean> {
  return run(p, commitStatements(lines, ref, now))
}
