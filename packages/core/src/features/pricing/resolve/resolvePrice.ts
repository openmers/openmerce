import type { PriceListType } from "../types"

/** Aday fiyat satırı: `prices` satırı + listesinin seçim alanları (`getPrices` çıktısı). */
export type PriceCandidate = {
  priceList: string
  type: PriceListType
  priority: number
  startsAt: number | null
  endsAt: number | null
  status: "active" | "expired"
  minQty: number
  amount: number
  compareAtAmount: number | null
  currency: string
}

export type ResolvePriceInput = {
  candidates: readonly PriceCandidate[]
  /** Oturumun liste kümesi (`ctx.priceListIds` karşılığı, `public_id`); yoksa adayların hepsi. */
  priceLists?: readonly string[]
  quantity: number
  currency: string
  now: number
}

export type SelectedPrice = {
  priceList: string
  type: PriceListType
  minQty: number
  amount: number
  compareAtAmount: number | null
  currency: string
}

export type ResolvePriceResult =
  | { ok: true; price: SelectedPrice }
  | { ok: false; code: "NO_PRICE" }

// 03-fiyat §2.3: önce `contract`, sonra geçerli `sale`, sonra `base`.
const TYPE_RANK: Record<PriceListType, number> = { contract: 0, sale: 1, base: 2 }

/** Geçerlilik tarihi sorguda değil seçimde: `starts_at <= now < ends_at`, `expired` liste dışarıda. */
function isLive(c: PriceCandidate, now: number): boolean {
  if (c.status !== "active") return false
  if (c.startsAt !== null && now < c.startsAt) return false
  if (c.endsAt !== null && now >= c.endsAt) return false
  return true
}

/**
 * Varsayılan `priceSelection` (saf). Liste sırası: tür (`contract` → `sale` → `base`), aynı
 * türde yüksek `priority` önce, eşitlikte `public_id` (belirlenimci). Seçilen listede miktara uyan
 * en yüksek `min_qty` kademesi. Miktara uyan kademesi olmayan liste atlanır (sonraki listeye
 * düşülür). Kur dönüşümü yapılmaz: başka para birimindeki satır aday değildir; uygun satır yoksa
 * `NO_PRICE` (0 değil).
 */
export function resolvePrice(input: ResolvePriceInput): ResolvePriceResult {
  if (!Number.isSafeInteger(input.quantity) || input.quantity < 1)
    return { ok: false, code: "NO_PRICE" }
  const allowed = input.priceLists ? new Set(input.priceLists) : undefined
  const eligible = input.candidates.filter(
    (c) =>
      c.currency === input.currency &&
      c.minQty <= input.quantity &&
      (!allowed || allowed.has(c.priceList)) &&
      isLive(c, input.now),
  )
  let best: PriceCandidate | undefined
  for (const c of eligible) {
    if (!best || compare(c, best) < 0) best = c
  }
  if (!best) return { ok: false, code: "NO_PRICE" }
  const { priceList, type, minQty, amount, compareAtAmount, currency } = best
  return { ok: true, price: { priceList, type, minQty, amount, compareAtAmount, currency } }
}

/** Negatif: `a` daha iyi. Liste sırası önce, aynı listede yüksek `min_qty`. */
function compare(a: PriceCandidate, b: PriceCandidate): number {
  const rank = TYPE_RANK[a.type] - TYPE_RANK[b.type]
  if (rank !== 0) return rank
  if (a.priority !== b.priority) return b.priority - a.priority
  if (a.priceList !== b.priceList) return a.priceList < b.priceList ? -1 : 1
  return b.minQty - a.minQty
}
