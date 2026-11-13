import type { CartData, CartTotals } from "../../cart"
import type { StockLine } from "../../stock"
import { CheckoutError } from "../types"

/**
 * Location allocation (pure): the total quantity of each stock-tracked variant goes to the first
 * channel location, by priority, that covers it alone. No splitting (no partial reservation);
 * `INSUFFICIENT_STOCK` if none does. The final decision is the reservation's conditional write;
 * this is only the choice.
 */
export function allocateStock(data: CartData): StockLine[] {
  const need = new Map<number, number>()
  for (const l of data.lines) {
    if (l.trackInventory) need.set(l.variantId, (need.get(l.variantId) ?? 0) + l.quantity)
  }
  const out: StockLine[] = []
  for (const [variantId, quantity] of need) {
    // `data.stock` is in priority order (loadCartData)
    const at = data.stock.find((s) => s.variantId === variantId && s.sellable >= quantity)
    if (!at) throw new CheckoutError("INSUFFICIENT_STOCK", "stok yetersiz")
    out.push({ variantId, locationId: at.locationId, quantity })
  }
  return out
}

export type SnapshotInput = {
  data: CartData
  totals: CartTotals
  allocation: readonly StockLine[]
  now: number
  /** Consent checkboxes (e.g. personalized-goods return notice) -> consent timestamp. */
  consents?: Readonly<Record<string, number>>
  /** `legal_policy` version; supplied by the caller until the settings feature exists. */
  legalPolicyVersion?: string | null
  attribution?: Readonly<Record<string, unknown>>
}

/**
 * Reservation snapshot (05-sepet §3, pure): order lines are read from here, never from provider
 * metadata. Lines, price/surcharge, discount, tax, shipping, addresses, location allocation.
 */
export function buildSnapshot(input: SnapshotInput): Record<string, unknown> {
  const { data, totals } = input
  const byId = new Map(data.lines.map((l) => [l.id, l]))
  const { options: _options, ...shipping } = totals.shipping
  return {
    version: 1,
    createdAt: input.now,
    cart: { publicId: data.cart.publicId, version: data.cart.version },
    currency: totals.currency,
    customerId: data.cart.customerId,
    companyId: data.cart.companyId,
    email: data.cart.email,
    lines: totals.lines.map((l) => {
      const src = byId.get(l.lineId)
      return {
        ...l,
        variantPublicId: src?.variantPublicId,
        lineKey: src?.lineKey ?? "",
        personalization: src?.personalization ?? null,
        customFields: src?.customFields ?? null,
      }
    }),
    shipping,
    promotions: totals.promotions.filter((p) => p.effective),
    adjustments: totals.adjustments,
    totals: {
      subtotal: totals.subtotal,
      discount: totals.discount,
      net: totals.net,
      tax: totals.tax,
      gross: totals.gross,
    },
    addresses: { shipping: data.cart.shippingAddress, billing: data.cart.billingAddress },
    allocation: input.allocation,
    consents: input.consents ?? {},
    legalPolicyVersion: input.legalPolicyVersion ?? null,
    attribution: input.attribution ?? {},
  }
}
