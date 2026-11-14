import { Time } from "@internationalized/date"
import type { TimeValue } from "../../date-segment/use-date-field"
import { TimeInput } from "../TimeInput"

export function TimeInputExample({
  onChange,
  hourCycle = 24,
  locale = "tr",
}: {
  onChange?: (value: TimeValue | undefined) => void
  hourCycle?: 12 | 24
  locale?: string
}) {
  return (
    <TimeInput
      defaultValue={new Time(14, 30)}
      onChange={onChange}
      hourCycle={hourCycle}
      locale={locale}
    />
  )
}
