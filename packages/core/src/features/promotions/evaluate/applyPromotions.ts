import { byPriority } from "../registry/compilePromotions"
import type { Adjustment, CompiledPromotion, Discount, PromoCart, PromoLine } from "../types"

export type PromotionResult = {
  promotionId: number
  /** Koşullar tuttu ama hiçbir yerde > 0 indirim yok: sayaç tüketmez (08 §3 "etkisiz"). */
  effective: boolean
  discount: number
}

export type ApplyPromotionsResult = {
  adjustments: Adjustment[]
  /** Koşulları tutan promosyonlar, uygulanma sırasında. */
  results: PromotionResult[]
  /** Satır başına toplam indirim (satır + dağıtılmış sipariş indirimi); vergi bunun üstünden. */
  lineDiscounts: Record<string, number>
  shippingDiscount: number
}

function isLive(p: CompiledPromotion, cart: PromoCart, now: number, coupons: Set<string>): boolean {
  if (!p.channelIds.has(cart.channelId)) return false
  if (p.startsAt !== null && now < p.startsAt) return false
  if (p.endsAt !== null && now >= p.endsAt) return false
  if (p.couponCode !== null && !coupons.has(p.couponCode.toUpperCase())) return false
  // gösterim için; doğruluk rezervasyonda koşullu artışla
  if (p.usageLimit !== null && p.used >= p.usageLimit) return false
  return true
}

/**
 * Promosyonları sepete uygular (08-promosyon §2, saf). Tarih/kanal/kupon süzgeci, öncelik sırası
 * (yüksek önce), koşulların hepsi doğruysa eylemler. Eylemler önceki promosyonlardan **kalan**
 * tutar üstünde çalışır (üst üste binen indirim satırı eksiye düşürmez). `contract` fiyatlı satır
 * `applyToContract` olmayan promosyona görünmez. `stackable` olmayan promosyon etkili olursa
 * kalanlar atlanır; etkisiz (0 indirim) promosyon kesmez ve sayaç tüketmez.
 */
export function applyPromotions(input: {
  promotions: readonly CompiledPromotion[]
  cart: PromoCart
  now: number
}): ApplyPromotionsResult {
  const { cart, now } = input
  const coupons = new Set(cart.couponCodes.map((c) => c.trim().toUpperCase()))
  const remaining = new Map(cart.lines.map((l) => [l.key, l.amount]))
  let shipping = cart.shipping
  const out: ApplyPromotionsResult = {
    adjustments: [],
    results: [],
    lineDiscounts: Object.fromEntries(cart.lines.map((l) => [l.key, 0])),
    shippingDiscount: 0,
  }
  const live = input.promotions.filter((p) => isLive(p, cart, now, coupons)).sort(byPriority)

  for (const promo of live) {
    const lines = cart.lines.filter((l) => l.priceType !== "contract" || promo.applyToContract)
    const subtotal = lines.reduce((n, l) => n + l.amount, 0)
    if (!promo.conditions.every((check) => check({ cart, lines, subtotal }))) continue

    let discount = 0
    const eligible = new Set(lines.map((l) => l.key))
    const take = (line: PromoLine["key"], amount: number): number => {
      if (!eligible.has(line)) return 0
      const left = remaining.get(line) ?? 0
      const applied = Math.max(0, Math.min(left, amount))
      remaining.set(line, left - applied)
      out.lineDiscounts[line] = (out.lineDiscounts[line] ?? 0) + applied
      return applied
    }
    for (const action of promo.actions) {
      const state = {
        lines: lines.map((line) => ({ line, remaining: remaining.get(line.key) ?? 0 })),
        shipping,
      }
      for (const d of action(state)) {
        const applied = applyDiscount(d, take, () => {
          const amount = Math.max(0, Math.min(shipping, d.amount))
          shipping -= amount
          out.shippingDiscount += amount
          return amount
        })
        if (applied.amount > 0) out.adjustments.push({ ...applied, promotionId: promo.id })
        discount += applied.amount
      }
    }
    out.results.push({ promotionId: promo.id, effective: discount > 0, discount })
    if (discount > 0 && !promo.stackable) break
  }
  return out
}

function applyDiscount(
  d: Discount,
  take: (key: string, amount: number) => number,
  takeShipping: () => number,
): Discount {
  if (d.target === "line") return { ...d, amount: take(d.lineKey, d.amount) }
  if (d.target === "shipping") return { ...d, amount: takeShipping() }
  const allocation = d.allocation.map((a) => ({ ...a, amount: take(a.lineKey, a.amount) }))
  return { ...d, allocation, amount: allocation.reduce((n, a) => n + a.amount, 0) }
}
