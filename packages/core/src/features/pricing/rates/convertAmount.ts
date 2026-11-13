/** Scale of `currency_rates.rate_e9`: 1 `base` = `rate_e9 / 10^9` `quote`. */
export const RATE_SCALE = 1_000_000_000n

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)

export type MinorDigits = {
  /** Minor unit digits of the source currency (USD/EUR/TRY 2, JPY 0); default 2. */
  from?: number
  /** Minor unit digits of the target; default 2. */
  to?: number
}

function digits(value: number | undefined): bigint {
  const d = value ?? 2
  if (!Number.isInteger(d) || d < 0 || d > 4) throw new RangeError(`geçersiz basamak: ${d}`)
  return BigInt(d)
}

/**
 * Converts a minor unit amount by the rate; the intermediate product is a `BigInt` (no floating point, no overflow).
 * Rounding: **half-up** to integer minor units. In the docs, the list's `fx_rounding`
 * rule (e.g. `ceil` + step + ending) is applied on top of this in the currency conversion task.
 * `RangeError` if the result exceeds the safe integer range.
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
  // floor(num/den + 1/2) = floor((2·num + den) / (2·den)); both are non-negative.
  const result = (2n * num + den) / (2n * den)
  if (result > MAX_SAFE) throw new RangeError("çevrilen tutar güvenli tamsayı aralığını aşıyor")
  return Number(result)
}
