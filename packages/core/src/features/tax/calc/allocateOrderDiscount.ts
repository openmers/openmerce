import { TaxError } from "../types"

/**
 * Distributes an order discount proportionally across lines (09-vergi §2.6, pure; promotions use it too).
 * The remainder cent rule lives in one place: each line gets `floor(discount × amount / total)`; leftover cents
 * are handed out one by one starting from the largest fractional remainder, ties go to the earlier line. So
 * the total is preserved and the result is deterministic by input order. If the discount exceeds the total it is
 * clipped to the total (no line goes negative); if the total is 0, all are 0.
 */
export function allocateOrderDiscount(discount: number, amounts: readonly number[]): number[] {
  for (const value of [discount, ...amounts]) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TaxError("INVALID_INPUT", "tutarlar negatif olmayan tamsayı olmalı")
    }
  }
  const total = amounts.reduce((a, b) => a + b, 0)
  if (!Number.isSafeInteger(total)) throw new TaxError("INVALID_INPUT", "toplam çok büyük")
  if (total === 0) return amounts.map(() => 0)
  const d = BigInt(Math.min(discount, total))
  const t = BigInt(total)
  const shares = amounts.map((a) => (d * BigInt(a)) / t)
  const rest = amounts.map((a, i) => ({ i, frac: (d * BigInt(a)) % t }))
  let left = Number(d - shares.reduce((a, b) => a + b, 0n))
  rest.sort((x, y) => (x.frac === y.frac ? x.i - y.i : x.frac > y.frac ? -1 : 1))
  for (const { i } of rest) {
    if (left === 0) break
    shares[i] = (shares[i] ?? 0n) + 1n
    left -= 1
  }
  return shares.map(Number)
}
