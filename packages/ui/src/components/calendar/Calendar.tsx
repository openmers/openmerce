import {
  type CalendarDate,
  DateFormatter,
  type DateValue,
  getLocalTimeZone,
  getWeeksInMonth,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  toCalendarDate,
  today,
} from "@internationalized/date"
import { type ComponentProps, type KeyboardEvent, useEffect, useRef, useState } from "react"
import { cn } from "../../utils/cn"
import { CalendarHeader } from "./CalendarHeader"
import { CalendarContext, useCalendar } from "./context"
import {
  calendarCellVariants,
  calendarDayVariants,
  calendarHeadCellVariants,
  calendarTodayDotSelectedVariants,
  calendarTodayDotVariants,
  calendarVariants,
} from "./variants"

type CalendarProps = Omit<ComponentProps<"fieldset">, "defaultValue"> & {
  value?: DateValue
  defaultValue?: DateValue
  onValueChange?: (value: DateValue | undefined) => void
  /** The date whose month is shown when there is no value. */
  placeholder?: DateValue
  locale?: string
  minValue?: DateValue
  maxValue?: DateValue
  isDateUnavailable?: (date: DateValue) => boolean
  disabled?: boolean
}

export function Calendar({
  value: valueProp,
  defaultValue,
  onValueChange,
  placeholder,
  locale = "en",
  minValue,
  maxValue,
  isDateUnavailable,
  disabled = false,
  className,
  children,
  ...rest
}: CalendarProps) {
  const [internal, setInternal] = useState(defaultValue)
  const value = valueProp ?? internal
  const start = toCalendarDate(value ?? placeholder ?? today(getLocalTimeZone()))
  const [focused, setFocused] = useState(start)
  const [month, setMonth] = useState(startOfMonth(start))
  const focusPending = useRef(false)
  const root = useRef<HTMLFieldSetElement>(null)

  useEffect(() => {
    if (!focusPending.current) return
    focusPending.current = false
    root.current?.querySelector<HTMLElement>(`[data-value="${focused}"]`)?.focus()
  }, [focused])

  const isDisabled = (date: CalendarDate) =>
    disabled ||
    (minValue !== undefined && date.compare(toCalendarDate(minValue)) < 0) ||
    (maxValue !== undefined && date.compare(toCalendarDate(maxValue)) > 0)
  const isUnavailable = (date: CalendarDate) => isDateUnavailable?.(date) ?? false

  function moveFocus(date: CalendarDate, focus: boolean) {
    if (!isSameMonth(date, month)) setMonth(startOfMonth(date))
    focusPending.current = focus
    setFocused(date)
  }

  function select(date: CalendarDate) {
    if (isDisabled(date) || isUnavailable(date)) return
    moveFocus(date, false)
    setInternal(date)
    onValueChange?.(date)
  }

  return (
    <CalendarContext.Provider
      value={{
        locale,
        month,
        setMonth,
        value,
        select,
        focused,
        moveFocus,
        isDisabled,
        isUnavailable,
      }}
    >
      <fieldset ref={root} className={cn(calendarVariants(), className)} {...rest}>
        {children}
        <CalendarHeader />
        <CalendarGrid />
      </fieldset>
    </CalendarContext.Provider>
  )
}

export function CalendarGrid({ className }: { className?: string }) {
  const { locale, month } = useCalendar()
  const first = startOfWeek(month, locale)
  const weeks = Array.from({ length: getWeeksInMonth(month, locale) }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => first.add({ days: w * 7 + d })),
  )
  const weekday = new DateFormatter(locale, { weekday: "short" })
  return (
    // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the calendar is an ARIA date grid; days inside are the focusable cells
    <table role="grid" data-calendar-grid="" className={cn(className)}>
      <thead>
        <tr>
          {weeks[0]?.map((date) => (
            <th key={date.toString()} className={calendarHeadCellVariants()}>
              {weekday.format(date.toDate(getLocalTimeZone()))}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={week[0]?.toString()}>
            {week.map((date) => (
              <CalendarCell key={date.toString()} date={date} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CalendarCell({ date }: { date: CalendarDate }) {
  const { value } = useCalendar()
  const selected = value !== undefined && isSameDay(date, value)
  return (
    // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: grid cell of the ARIA date grid
    // biome-ignore lint/a11y/useFocusableInteractive: focus lives on the day button inside the cell
    <td role="gridcell" aria-selected={selected} className={calendarCellVariants()}>
      <CalendarDay date={date} />
    </td>
  )
}

const KEY_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
}

export function CalendarDay({ date, className }: { date: CalendarDate; className?: string }) {
  const { locale, month, value, select, focused, moveFocus, isDisabled, isUnavailable } =
    useCalendar()
  const selected = value !== undefined && isSameDay(date, value)
  const disabled = isDisabled(date)
  const unavailable = isUnavailable(date)
  const current = isToday(date, getLocalTimeZone())

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = KEY_STEPS[event.key]
    if (step === undefined) return
    event.preventDefault()
    moveFocus(date.add({ days: step }), true)
  }

  return (
    <button
      type="button"
      data-calendar-day=""
      data-value={date.toString()}
      data-selected={selected ? "" : undefined}
      data-today={current ? "" : undefined}
      data-outside-month={isSameMonth(date, month) ? undefined : ""}
      data-disabled={disabled ? "" : undefined}
      data-unavailable={unavailable ? "" : undefined}
      aria-disabled={disabled || unavailable || undefined}
      aria-label={new DateFormatter(locale, { dateStyle: "full" }).format(
        date.toDate(getLocalTimeZone()),
      )}
      tabIndex={isSameDay(date, focused) ? 0 : -1}
      className={cn(calendarDayVariants(), className)}
      onClick={() => select(date)}
      onKeyDown={onKeyDown}
    >
      {date.day}
      {current && (
        <div
          role="none"
          className={cn(calendarTodayDotVariants(), selected && calendarTodayDotSelectedVariants())}
        />
      )}
    </button>
  )
}
