import type { Address, Zone } from "../../tax/types"
import { BUILT_IN_CALCULATORS } from "../calculators"
import { pickupEligible, type StockAt } from "../eligibility/pickup"
import { zoneEligible } from "../eligibility/zone"
import type { CalculatorDef, Parcel, ShipLine, ShippingMethod } from "../types"

export type ShippingOption = {
  methodId: number
  publicId: string
  name: string
  amount: number
  taxCategoryId: number
  pickupLocationId: number | null
}

export type QuoteInput = {
  methods: readonly ShippingMethod[]
  channelId: number
  lines: readonly ShipLine[]
  address: Address | null
  zones: readonly Zone[]
  subtotal: number
  stockAt: StockAt
  calculators?: ReadonlyMap<string, CalculatorDef<never>>
}

export type Quote = { needsShipping: boolean; parcel: Parcel; options: ShippingOption[] }

/** Birim değer × adet toplamı; bir kalem bilinmiyorsa `null`. */
function total(lines: readonly ShipLine[], unit: (l: ShipLine) => number | null): number | null {
  let sum = 0
  for (const l of lines) {
    const value = unit(l)
    if (value === null) return null
    sum += value * l.quantity
  }
  if (!Number.isSafeInteger(sum)) throw new Error("kargo toplamı çok büyük")
  return sum
}

const volume = (l: ShipLine) =>
  l.length === null || l.width === null || l.height === null ? null : l.length * l.width * l.height

/**
 * Kargo seçenekleri (10-kargo §1, saf, sorgu yok). Yalnız fiziksel kalemler tartılır (karma
 * sepette dijital kalem kargoya girmez); fiziksel kalem yoksa kargo gerekmez. Kanala bağlı
 * yöntemlerden bölge (mağazadan teslimde depo stoku) uygun olanlar ve hesaplayıcısı sonuç
 * verenler, ücrete göre sıralı. `checker_code` dolu ya da hesaplayıcısı yerleşik olmayan
 * (canlı oran app'i) yöntem burada sunulmaz; kanca portu ayrı iştir.
 */
export function quoteShipping(input: QuoteInput): Quote {
  const physical = input.lines.filter((l) => l.physical)
  const parcel: Parcel = {
    weightGrams: total(physical, (l) => l.weight),
    volumeMm3: total(physical, volume),
    subtotal: input.subtotal,
  }
  if (physical.length === 0) return { needsShipping: false, parcel, options: [] }

  const calculators = input.calculators ?? BUILT_IN_CALCULATORS
  const options: ShippingOption[] = []
  for (const m of input.methods) {
    if (!m.channelIds.includes(input.channelId) || m.checkerCode !== null) continue
    const located =
      m.pickupLocationId === null
        ? zoneEligible(m, input.address, input.zones)
        : pickupEligible(m, physical, input.stockAt)
    if (!located) continue
    const calc = calculators.get(m.calculatorCode)
    const args = calc?.args.safeParse(m.calculatorArgs)
    if (!calc || !args?.success) continue
    const result = calc.calculate(args.data, parcel)
    if (!result.ok) continue
    options.push({
      methodId: m.id,
      publicId: m.publicId,
      name: m.name,
      amount: result.amount,
      taxCategoryId: m.taxCategoryId,
      pickupLocationId: m.pickupLocationId,
    })
  }
  options.sort((a, b) => a.amount - b.amount || a.methodId - b.methodId)
  return { needsShipping: true, parcel, options }
}
