/**
 * Segment = cache key (05-onbellek). Channel + language + currency + price list set.
 * Price list order is not part of the key: the same set in a different order is the same segment; priority order
 * stays in `ctx.priceListIds`. Pure; no clock, I/O or randomness.
 */
export type SegmentInput = {
  /** `channel.publicId` (not the internal integer id: the cache key must be stable externally). */
  channel: string
  lang: string
  currency: string
  priceListIds: readonly number[]
}

const SEPARATOR = "|"

/** Price list ids: non-negative integers, deduplicated, in ascending order. */
export function normalizePriceListIds(ids: readonly number[]): number[] {
  const seen = new Set<number>()
  for (const id of ids) {
    if (!Number.isInteger(id) || id < 0) {
      throw new RangeError(`geçersiz fiyat listesi kimliği: ${String(id)}`)
    }
    seen.add(id)
  }
  return [...seen].sort((a, b) => a - b)
}

function part(name: string, value: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) throw new RangeError(`${name} boş olamaz`)
  if (trimmed.includes(SEPARATOR)) throw new RangeError(`${name} "${SEPARATOR}" içeremez`)
  return trimmed
}

/**
 * Stable segment key. Language is normalized to lowercase, currency to uppercase
 * (`EN`/`en`, `usd`/`USD` give the same key). Input containing the separator throws: two different
 * segments cannot collapse into the same key.
 */
export function segmentKey(input: SegmentInput): string {
  const channel = part("kanal", input.channel)
  const lang = part("dil", input.lang).toLowerCase()
  const currency = part("para birimi", input.currency).toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new RangeError(`geçersiz para birimi: ${currency}`)
  }
  const priceListIds = normalizePriceListIds(input.priceListIds)
  return [channel, lang, currency, priceListIds.join(",")].join(SEPARATOR)
}
