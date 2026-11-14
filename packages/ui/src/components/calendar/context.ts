import type { CalendarDate, DateValue } from "@internationalized/date"
import { createContext, useContext } from "react"

export type CalendarState = {
  locale: string
  /** First day of the visible month. */
  month: CalendarDate
  setMonth: (month: CalendarDate) => void
  value: DateValue | undefined
  select: (date: CalendarDate) => void
  focused: CalendarDate
  /** Moves the roving focus; `focus` also moves DOM focus to the new day. */
  moveFocus: (date: CalendarDate, focus: boolean) => void
  isDisabled: (date: CalendarDate) => boolean
  isUnavailable: (date: CalendarDate) => boolean
}

export const CalendarContext = createContext<CalendarState | null>(null)

export function useCalendar(): CalendarState {
  const state = useContext(CalendarContext)
  if (!state) throw new Error("Calendar parts must be rendered inside <Calendar>")
  return state
}
