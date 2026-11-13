import { TaxError } from "../types"

export type SplitInput = {
  /** Satır tutarı (küçük birim): dahilse brüt, hariçse net. */
  amount: number
  /** Toplam oran, baz puan. */
  rateBp: number
  includesTax: boolean
}

export type Split = { net: number; tax: number; gross: number }

const BP = 10_000n

/** `a / b`, yarım yukarı (negatif olmayan tamsayılar). */
function divRound(a: bigint, b: bigint): bigint {
  return (2n * a + b) / (2n * b)
}

function assertInt(value: number, what: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TaxError("INVALID_INPUT", `${what} negatif olmayan tamsayı olmalı`)
  }
}

/**
 * Dahil/hariç dönüşüm (09-vergi §2.3-2.4, saf); e-fatura app'i de bunu kullanır. Yuvarlama
 * **satır düzeyinde** ve tektir: dahilse net = round(brüt × 10000 / (10000 + oran)), vergi = brüt −
 * net; hariçse vergi = round(net × oran / 10000), brüt = net + vergi. Yarım yukarı; ara çarpım
 * `bigint` (taşma yok). Her iki yönde `net + tax = gross` kesin.
 */
export function splitGrossNet(input: SplitInput): Split {
  assertInt(input.amount, "tutar")
  assertInt(input.rateBp, "oran")
  const amount = BigInt(input.amount)
  const rate = BigInt(input.rateBp)
  if (input.includesTax) {
    const net = Number(divRound(amount * BP, BP + rate))
    return { net, tax: input.amount - net, gross: input.amount }
  }
  const tax = Number(divRound(amount * rate, BP))
  const gross = input.amount + tax
  if (!Number.isSafeInteger(gross)) throw new TaxError("INVALID_INPUT", "tutar çok büyük")
  return { net: input.amount, tax, gross }
}

/** Satırları ayrı ayrı böler; sipariş toplamları satırların toplamıdır (yeniden yuvarlanmaz). */
export function splitLines(lines: readonly SplitInput[]): Split & { lines: Split[] } {
  const out = lines.map(splitGrossNet)
  const sum = (k: keyof Split) => out.reduce((acc, s) => acc + s[k], 0)
  return { lines: out, net: sum("net"), tax: sum("tax"), gross: sum("gross") }
}
