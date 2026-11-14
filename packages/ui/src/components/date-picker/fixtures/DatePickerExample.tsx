import { CalendarDate, type DateValue } from "@internationalized/date"
import { DatePicker } from "../DatePicker"

export function DatePickerExample({
  onValueChange,
  size = "base",
}: {
  onValueChange?: (value: DateValue | undefined) => void
  size?: "base" | "small"
}) {
  return (
    <DatePicker
      defaultValue={new CalendarDate(2026, 11, 12)}
      onValueChange={onValueChange}
      size={size}
    />
  )
}
