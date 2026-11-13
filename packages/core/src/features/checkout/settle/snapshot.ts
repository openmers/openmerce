import type { ShippingTotals, TotalsLine } from "../../cart"
import type { Adjustment, PromotionResult } from "../../promotions"
import type { StockLine } from "../../stock"

/** The parts of the reservation snapshot (`buildSnapshot`) settlement reads. */
export type SettleSnapshot = {
  currency: string
  customerId: number | null
  companyId: number | null
  lines: (TotalsLine & {
    variantPublicId?: string
    personalization: Record<string, unknown> | null
  })[]
  shipping: Omit<ShippingTotals, "options">
  promotions: PromotionResult[]
  adjustments: Adjustment[]
  totals: { subtotal: number; discount: number; net: number; tax: number; gross: number }
  addresses: {
    shipping: Record<string, unknown> | null
    billing: Record<string, unknown> | null
  }
  allocation: StockLine[]
  consents: Record<string, number>
  legalPolicyVersion: string | null
}

export function parseSnapshot(raw: unknown): SettleSnapshot {
  const s = (typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<SettleSnapshot>
  return {
    currency: String(s.currency),
    customerId: s.customerId ?? null,
    companyId: s.companyId ?? null,
    lines: s.lines ?? [],
    shipping: s.shipping ?? {
      needsShipping: false,
      methodId: null,
      amount: 0,
      discount: 0,
      net: 0,
      tax: 0,
      gross: 0,
    },
    promotions: s.promotions ?? [],
    adjustments: s.adjustments ?? [],
    totals: s.totals ?? { subtotal: 0, discount: 0, net: 0, tax: 0, gross: 0 },
    addresses: s.addresses ?? { shipping: null, billing: null },
    allocation: s.allocation ?? [],
    consents: s.consents ?? {},
    legalPolicyVersion: s.legalPolicyVersion ?? null,
  }
}
