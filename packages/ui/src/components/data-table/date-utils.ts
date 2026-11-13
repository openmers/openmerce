import type { DateValue } from "@internationalized/date"
import { toCalendarDate, toCalendarDateTime } from "@internationalized/date"

export type DateGranularity = "day" | "minute"

export function toDateValue(
  iso: string | undefined,
  granularity: DateGranularity,
): DateValue | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  return granularity === "minute" ? toCalendarDateTime(date) : toCalendarDate(date)
}

export function fromDateValue(value: DateValue | undefined): string | undefined {
  return value ? value.toDate("UTC").toISOString() : undefined
}
