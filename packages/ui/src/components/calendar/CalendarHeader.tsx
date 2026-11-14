import { DateFormatter, getLocalTimeZone } from "@internationalized/date"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { IconButton } from "../icon-button"
import { useCalendar } from "./context"
import { calendarButtonVariants, calendarHeaderVariants, calendarHeadingVariants } from "./variants"

export function CalendarHeader({ className }: { className?: string }) {
  const { locale, month } = useCalendar()
  const heading = new DateFormatter(locale, { month: "long", year: "numeric" }).format(
    month.toDate(getLocalTimeZone()),
  )
  return (
    <div className={cn(calendarHeaderVariants(), className)}>
      <CalendarPrevButton />
      <div className="flex items-center justify-center">
        <div data-calendar-heading="" aria-live="polite" className={calendarHeadingVariants()}>
          {heading}
        </div>
      </div>
      <CalendarNextButton />
    </div>
  )
}

function MonthButton({ step, className, ...rest }: ComponentProps<"button"> & { step: 1 | -1 }) {
  const { month, setMonth, isDisabled } = useCalendar()
  const target = month.add({ months: step })
  const edge = step === 1 ? target : target.add({ months: 1 }).subtract({ days: 1 })
  return (
    <IconButton
      type="button"
      size="small"
      variant="transparent"
      className={cn(calendarButtonVariants(), className)}
      aria-label={step === 1 ? "Sonraki ay" : "Önceki ay"}
      disabled={isDisabled(edge)}
      onClick={() => setMonth(target)}
      {...rest}
    >
      {step === 1 ? <ChevronRight /> : <ChevronLeft />}
    </IconButton>
  )
}

export function CalendarPrevButton(props: ComponentProps<"button">) {
  return <MonthButton step={-1} {...props} />
}

export function CalendarNextButton(props: ComponentProps<"button">) {
  return <MonthButton step={1} {...props} />
}
