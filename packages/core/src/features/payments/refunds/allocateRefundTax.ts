import { allocateOrderDiscount } from "../../tax"
import { PaymentError } from "../types"

export type TaxLineShare = { orderLineId: number | null; rateBp: number; amount: number }

export type RefundTaxAllocation = {
  /** Tax part of the refund. */
  tax: number
  lines: (TaxLineShare & { refundTax: number })[]
}

/**
 * Splits a refund over the order's tax lines (06 §5, pure): the tax part is
 * `round(refund × taxTotal / orderGross)` (half up), then distributed over the tax lines with the
 * shared remainder rule (`allocateOrderDiscount`), so the parts always add up.
 */
export function allocateRefundTax(
  refund: number,
  orderGross: number,
  taxLines: readonly TaxLineShare[],
): RefundTaxAllocation {
  for (const v of [refund, orderGross]) {
    if (!Number.isSafeInteger(v) || v < 0) {
      throw new PaymentError("INVALID_INPUT", "amounts must be non-negative integers")
    }
  }
  if (refund > orderGross) throw new PaymentError("INVALID_INPUT", "refund exceeds order total")
  const taxTotal = taxLines.reduce((n, l) => n + l.amount, 0)
  if (orderGross === 0 || taxTotal === 0) {
    return { tax: 0, lines: taxLines.map((l) => ({ ...l, refundTax: 0 })) }
  }
  const num = BigInt(refund) * BigInt(taxTotal) * 2n + BigInt(orderGross)
  const tax = Number(num / (BigInt(orderGross) * 2n))
  const shares = allocateOrderDiscount(
    tax,
    taxLines.map((l) => l.amount),
  )
  return { tax, lines: taxLines.map((l, i) => ({ ...l, refundTax: shares[i] ?? 0 })) }
}
