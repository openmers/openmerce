import { TaxError } from "../types"

export type SplitInput = {
  /** Line amount (minor units): gross if inclusive, net if exclusive. */
  amount: number
  /** Total rate, basis points. */
  rateBp: number
  includesTax: boolean
}

export type Split = { net: number; tax: number; gross: number }

const BP = 10_000n

/** `a / b`, half-up (non-negative integers). */
function divRound(a: bigint, b: bigint): bigint {
  return (2n * a + b) / (2n * b)
}

function assertInt(value: number, what: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TaxError("INVALID_INPUT", `${what} negatif olmayan tamsayı olmalı`)
  }
}

/**
 * Inclusive/exclusive conversion (09-vergi §2.3-2.4, pure); the e-invoice app uses it too. Rounding
 * happens **at line level** and once: if inclusive, net = round(gross × 10000 / (10000 + rate)), tax = gross −
 * net; if exclusive, tax = round(net × rate / 10000), gross = net + tax. Half-up; the intermediate product is
 * a `bigint` (no overflow). `net + tax = gross` holds exactly in both directions.
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

/** Splits lines individually; order totals are the sum of the lines (not re-rounded). */
export function splitLines(lines: readonly SplitInput[]): Split & { lines: Split[] } {
  const out = lines.map(splitGrossNet)
  const sum = (k: keyof Split) => out.reduce((acc, s) => acc + s[k], 0)
  return { lines: out, net: sum("net"), tax: sum("tax"), gross: sum("gross") }
}
