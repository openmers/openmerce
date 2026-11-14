import type { DateValue } from "@internationalized/date"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { useState } from "react"
import { cn } from "../../utils/cn"
import { Calendar } from "../calendar/Calendar"
import { DateSegments } from "../date-segment/DateSegment"
import { type Granularity, useDateField } from "../date-segment/use-date-field"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "../popover/Popover"
import {
  datePickerButtonVariants,
  datePickerClearButtonVariants,
  datePickerContentVariants,
  datePickerGroupVariants,
  datePickerPanelVariants,
} from "./variants"

type DatePickerProps = {
  value?: DateValue
  defaultValue?: DateValue
  onValueChange?: (value: DateValue | undefined) => void
  placeholder?: DateValue
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  minValue?: DateValue
  maxValue?: DateValue
  isDateUnavailable?: (date: DateValue) => boolean
  /** The kit's `shouldCloseOnSelect`. */
  shouldCloseOnSelect?: boolean
  granularity?: Granularity
  locale?: string
  size?: "base" | "small"
  disabled?: boolean
  className?: string
  "aria-label"?: string
}

export function DatePicker({
  value: valueProp,
  defaultValue,
  onValueChange,
  placeholder,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  minValue,
  maxValue,
  isDateUnavailable,
  shouldCloseOnSelect = true,
  granularity = "day",
  locale = "tr",
  size = "base",
  disabled = false,
  className,
  "aria-label": ariaLabel = "Date input",
}: DatePickerProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const value = valueProp === undefined ? internalValue : valueProp
  const open = openProp ?? internalOpen

  function setValue(next: DateValue | undefined) {
    setInternalValue(next)
    onValueChange?.(next)
  }
  function setOpen(next: boolean) {
    setInternalOpen(next)
    onOpenChange?.(next)
  }

  const segments = useDateField({
    value,
    onChange: setValue,
    kind: "date",
    granularity,
    locale,
    disabled,
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            datePickerGroupVariants({ size, hasValue: Boolean(value), isOpen: open }),
            className,
          )}
        >
          <PopoverTrigger
            className={datePickerButtonVariants({ size })}
            aria-label="Open calendar"
            disabled={disabled}
          >
            <CalendarIcon />
          </PopoverTrigger>
          <fieldset data-date-field-input="" aria-label={ariaLabel}>
            <DateSegments segments={segments} />
          </fieldset>
          {value && (
            <button
              type="button"
              className={datePickerClearButtonVariants()}
              aria-label="Clear date"
              disabled={disabled}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setValue(undefined)
              }}
            >
              <X />
            </button>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent className={datePickerContentVariants()}>
        <Calendar
          className={datePickerPanelVariants()}
          value={value}
          onValueChange={(next) => {
            // Keep the time of day when the field is finer than a day.
            const merged = next && value && "hour" in value ? value.set(next) : next
            setValue(merged)
            if (shouldCloseOnSelect) setOpen(false)
          }}
          placeholder={placeholder}
          locale={locale}
          minValue={minValue}
          maxValue={maxValue}
          isDateUnavailable={isDateUnavailable}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  )
}
