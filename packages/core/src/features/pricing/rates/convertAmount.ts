/** `currency_rates.rate_e9` ölçeği: 1 `base` = `rate_e9 / 10^9` `quote`. */
export const RATE_SCALE = 1_000_000_000n

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)

export type MinorDigits = {
  /** Kaynak para biriminin küçük birim basamağı (USD/EUR/TRY 2, JPY 0); varsayılan 2. */
  from?: number
  /** Hedefin küçük birim basamağı; varsayılan 2. */
  to?: number
}

function digits(value: number | undefined): bigint {
  const d = value ?? 2
  if (!Number.isInteger(d) || d < 0 || d > 4) throw new RangeError(`geçersiz basamak: ${d}`)
  return BigInt(d)
}

/**
 * Küçük birim tutarı kurla çevirir; ara çarpım `BigInt`'tir (kayan nokta yok, taşma yok).
 * Yuvarlama: **yarım yukarı** (half-up) tamsayı küçük birime. Belgede listenin `fx_rounding`
 * kuralı (ör. `ceil` + adım + bitiş) kur dönüşümü görevinde bunun üzerine uygulanır.
 * Sonuç güvenli tamsayıyı aşarsa `RangeError`.
 */
export function convertAmount(amount: number, rateE9: number, minor: MinorDigits = {}): number {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new RangeError(`tutar negatif olmayan güvenli tamsayı olmalı: ${amount}`)
  }
  if (!Number.isSafeInteger(rateE9) || rateE9 <= 0) {
    throw new RangeError(`kur pozitif güvenli tamsayı olmalı: ${rateE9}`)
  }
  const num = BigInt(amount) * BigInt(rateE9) * 10n ** digits(minor.to)
  const den = RATE_SCALE * 10n ** digits(minor.from)
  // floor(num/den + 1/2) = floor((2·num + den) / (2·den)); ikisi de negatif değil.
  const result = (2n * num + den) / (2n * den)
  if (result > MAX_SAFE) throw new RangeError("çevrilen tutar güvenli tamsayı aralığını aşıyor")
  return Number(result)
}
