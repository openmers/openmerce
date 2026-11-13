import { currencyRates } from "@openmers/db"
import { and, eq, sql } from "drizzle-orm"
import type { Platform } from "../../../platform"
import { assertCurrency, PricingError } from "../types"

export type CurrencyRateInput = {
  /** `YYYY-MM-DD`, UTC calendar day. */
  day: string
  base: string
  quote: string
  /** 1 `base` = `rateE9 / 10^9` `quote`. */
  rateE9: number
  /** `manual` or a `RateProvider` code. */
  source: string
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

function assertDay(day: string): void {
  if (!DAY.test(day)) throw new PricingError("INVALID_INPUT", `geçersiz gün: ${day}`)
}

/** Writes or corrects the day's rate (upsert on PK `(day, base, quote)`). */
export async function setRate(
  p: Pick<Platform, "db" | "atomic">,
  input: CurrencyRateInput,
  now: number,
): Promise<void> {
  assertDay(input.day)
  assertCurrency(input.base)
  assertCurrency(input.quote)
  if (input.base === input.quote) throw new PricingError("INVALID_INPUT", "aynı para birimi")
  if (!Number.isSafeInteger(input.rateE9) || input.rateE9 <= 0) {
    throw new PricingError("INVALID_INPUT", "kur pozitif tamsayı olmalı (rate_e9)")
  }
  if (input.source.trim().length === 0) throw new PricingError("INVALID_INPUT", "kaynak boş")
  await p.atomic([
    p.db
      .insert(currencyRates)
      .values({ ...input, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: [currencyRates.day, currencyRates.base, currencyRates.quote],
        set: {
          rateE9: sql`excluded.rate_e9`,
          source: sql`excluded.source`,
          updatedAt: sql`excluded.updated_at`,
        },
      })
      .toSQL(),
  ])
}

/**
 * Only that day's rate (`rate_e9`); `null` if missing. Rates are not guessed: falling back to the previous
 * day's rate is an explicit decision of the caller (the rate task).
 */
export async function getRate(
  p: Pick<Platform, "db">,
  input: { day: string; base: string; quote: string },
): Promise<number | null> {
  assertDay(input.day)
  const row = (
    await p.db
      .select({ rateE9: currencyRates.rateE9 })
      .from(currencyRates)
      .where(
        and(
          eq(currencyRates.day, input.day),
          eq(currencyRates.base, input.base),
          eq(currencyRates.quote, input.quote),
        ),
      )
      .limit(1)
  )[0]
  return row?.rateE9 ?? null
}
