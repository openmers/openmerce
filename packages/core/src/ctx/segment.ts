/**
 * Segment = önbellek anahtarı (05-onbellek). Kanal + dil + para birimi + fiyat listesi kümesi.
 * Fiyat listesi sırası anahtara girmez: aynı küme farklı sırada aynı segmenttir; öncelik sırası
 * `ctx.priceListIds` içinde kalır. Saf; saat, I/O ve rastgelelik yok.
 */
export type SegmentInput = {
  /** `channel.publicId` (iç tamsayı id değil: önbellek anahtarı dışa dönük kararlı olmalı). */
  channel: string
  lang: string
  currency: string
  priceListIds: readonly number[]
}

const SEPARATOR = "|"

/** Fiyat listesi kimlikleri: negatif olmayan tam sayı, tekilleştirilmiş, artan sırada. */
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
 * Kararlı segment anahtarı. Dil küçük harfe, para birimi büyük harfe normalize edilir
 * (`EN`/`en`, `usd`/`USD` aynı anahtar). Ayraç içeren girdi hata verir: iki farklı segment
 * aynı anahtara çökemez.
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
