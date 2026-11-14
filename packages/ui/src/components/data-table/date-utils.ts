import type { DateValue } from "@internationalized/date"
import { fromDate, toCalendarDate, toCalendarDateTime } from "@internationalized/date"

export type DateGranularity = "day" | "minute"

export function toDateValue(
  iso: string | undefined,
  granularity: DateGranularity,
): DateValue | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  const zoned = fromDate(date, "UTC")
  return granularity === "minute" ? toCalendarDateTime(zoned) : toCalendarDate(zoned)
}

export function fromDateValue(value: DateValue | undefined): string | undefined {
  return value ? value.toDate("UTC").toISOString() : undefined
}
