import type { PriceListType } from "../types"

/** Candidate price row: a `prices` row + its list's selection fields (`getPrices` output). */
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
  /** The session's list set (equivalent of `ctx.priceListIds`, `public_id`); all candidates if missing. */
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

// 03-fiyat §2.3: first `contract`, then a valid `sale`, then `base`.
const TYPE_RANK: Record<PriceListType, number> = { contract: 0, sale: 1, base: 2 }

/** Validity is checked at selection, not in the query: `starts_at <= now < ends_at`, `expired` lists are out. */
function isLive(c: PriceCandidate, now: number): boolean {
  if (c.status !== "active") return false
  if (c.startsAt !== null && now < c.startsAt) return false
  if (c.endsAt !== null && now >= c.endsAt) return false
  return true
}

/**
 * Default `priceSelection` (pure). List order: type (`contract` → `sale` → `base`), within the same
 * type higher `priority` first, ties by `public_id` (deterministic). In the selected list, the highest
 * `min_qty` tier matching the quantity. A list with no matching tier is skipped (falls through to the next
 * list). No currency conversion: rows in another currency are not candidates; if no row fits,
 * `NO_PRICE` (not 0).
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

/** Negative: `a` is better. List order first, then higher `min_qty` within the same list. */
function compare(a: PriceCandidate, b: PriceCandidate): number {
  const rank = TYPE_RANK[a.type] - TYPE_RANK[b.type]
  if (rank !== 0) return rank
  if (a.priority !== b.priority) return b.priority - a.priority
  if (a.priceList !== b.priceList) return a.priceList < b.priceList ? -1 : 1
  return b.minQty - a.minQty
}
