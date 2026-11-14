import { CalendarDate, type DateValue } from "@internationalized/date"
import { useState } from "react"
import { DateSegments } from "../DateSegment"
import { useDateField } from "../use-date-field"

export function DateSegmentExample({ empty = false }: { empty?: boolean }) {
  const [value, setValue] = useState<DateValue | undefined>(
    empty ? undefined : new CalendarDate(2026, 11, 12),
  )
  const segments = useDateField({ value, onChange: setValue, kind: "date", locale: "en-US" })
  return (
    <fieldset data-date-field-input="" aria-label="Tarih">
      <DateSegments segments={segments} />
    </fieldset>
  )
}
