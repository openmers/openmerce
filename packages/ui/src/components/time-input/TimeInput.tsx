import { useState } from "react"
import { cn } from "../../utils/cn"
import { DateSegments } from "../date-segment/DateSegment"
import { type TimeValue, useDateField } from "../date-segment/use-date-field"
import { timeInputVariants } from "./variants"

type TimeInputProps = {
  value?: TimeValue
  defaultValue?: TimeValue
  onChange?: (value: TimeValue | undefined) => void
  hourCycle?: 12 | 24
  locale?: string
  isDisabled?: boolean
  className?: string
  "aria-label"?: string
}

export function TimeInput({
  value: valueProp,
  defaultValue,
  onChange,
  hourCycle,
  locale = "tr",
  isDisabled = false,
  className,
  "aria-label": ariaLabel = "Time input",
}: TimeInputProps) {
  const [internal, setInternal] = useState(defaultValue)
  const segments = useDateField({
    value: valueProp ?? internal,
    onChange: (next) => {
      setInternal(next)
      onChange?.(next)
    },
    kind: "time",
    locale,
    hourCycle,
    disabled: isDisabled,
  })
  return (
    <fieldset
      data-time-field-input=""
      aria-label={ariaLabel}
      aria-disabled={isDisabled || undefined}
      className={cn(timeInputVariants({ isDisabled }), className)}
    >
      <DateSegments segments={segments} />
    </fieldset>
  )
}
