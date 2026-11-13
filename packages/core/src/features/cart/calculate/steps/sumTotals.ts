import type { ShippingTotals, TotalsLine } from "../types"

/** Step 5: totals are sums of the lines (and the shipping line), never re-rounded. */
export function sumTotals(lines: readonly TotalsLine[], shipping: ShippingTotals) {
  const sum = (k: "amount" | "discount" | "net" | "tax" | "gross") =>
    lines.reduce((n, l) => n + l[k], 0)
  return {
    subtotal: sum("amount"),
    discount: sum("discount") + shipping.discount,
    net: sum("net") + shipping.net,
    tax: sum("tax") + shipping.tax,
    gross: sum("gross") + shipping.gross,
  }
}
