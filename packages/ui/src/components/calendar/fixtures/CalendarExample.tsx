import { CalendarDate, type DateValue } from "@internationalized/date"
import { Calendar } from "../Calendar"

export function CalendarExample({
  onValueChange,
}: {
  onValueChange?: (value: DateValue | undefined) => void
}) {
  return (
    <Calendar
      defaultValue={new CalendarDate(2026, 11, 12)}
      onValueChange={onValueChange}
      locale="tr"
      aria-label="Tarih"
    />
  )
}
