import { TaxError } from "../types"

/**
 * Sipariş indirimini satırlara oransal dağıtır (09-vergi §2.6, saf; promosyon da kullanır).
 * Kalan kuruş kuralı tek yerde: her satır `floor(indirim × tutar / toplam)` alır; artan kuruşlar
 * kesirli kalanı büyük olandan başlayarak birer birer verilir, eşitlikte önceki satır. Böylece
 * toplam korunur ve sonuç girdi sırasına göre belirlenimcidir. İndirim toplamı aşarsa toplama
 * kırpılır (satır eksiye düşmez); toplam 0 ise hepsi 0.
 */
export function allocateOrderDiscount(discount: number, amounts: readonly number[]): number[] {
  for (const value of [discount, ...amounts]) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TaxError("INVALID_INPUT", "tutarlar negatif olmayan tamsayı olmalı")
    }
  }
  const total = amounts.reduce((a, b) => a + b, 0)
  if (!Number.isSafeInteger(total)) throw new TaxError("INVALID_INPUT", "toplam çok büyük")
  if (total === 0) return amounts.map(() => 0)
  const d = BigInt(Math.min(discount, total))
  const t = BigInt(total)
  const shares = amounts.map((a) => (d * BigInt(a)) / t)
  const rest = amounts.map((a, i) => ({ i, frac: (d * BigInt(a)) % t }))
  let left = Number(d - shares.reduce((a, b) => a + b, 0n))
  rest.sort((x, y) => (x.frac === y.frac ? x.i - y.i : x.frac > y.frac ? -1 : 1))
  for (const { i } of rest) {
    if (left === 0) break
    shares[i] = (shares[i] ?? 0n) + 1n
    left -= 1
  }
  return shares.map(Number)
}
