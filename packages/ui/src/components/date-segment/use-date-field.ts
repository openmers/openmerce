import {
  CalendarDate,
  CalendarDateTime,
  type DateValue,
  Time,
  type ZonedDateTime,
} from "@internationalized/date"
import { type KeyboardEvent, useState } from "react"

export type TimeValue = Time | CalendarDateTime | ZonedDateTime
export type SegmentPart = "year" | "month" | "day" | "hour" | "minute" | "second" | "dayPeriod"
export type Granularity = "day" | "hour" | "minute" | "second"
type NumericPart = Exclude<SegmentPart, "dayPeriod">
type Parts = Partial<Record<NumericPart, number>>

export type DateFieldSegment = {
  part: SegmentPart | "literal"
  value: string
  props?: Record<string, unknown>
}

type Options<T> = {
  value: T | undefined
  onChange: (value: T | undefined) => void
  /** "time" edits only the clock; "date" edits the calendar day and, with a finer granularity, the clock. */
  kind: "date" | "time"
  granularity?: Granularity
  locale: string
  hourCycle?: 12 | 24
  disabled?: boolean
}

const PLACEHOLDERS: Record<string, Partial<Record<SegmentPart, string>>> = {
  tr: { year: "yyyy", month: "aa", day: "gg" },
}
const DEFAULT_PLACEHOLDERS: Record<SegmentPart, string> = {
  year: "yyyy",
  month: "mm",
  day: "dd",
  hour: "––",
  minute: "––",
  second: "––",
  dayPeriod: "AM",
}
const MAX: Record<NumericPart, number> = {
  year: 9999,
  month: 12,
  day: 31,
  hour: 23,
  minute: 59,
  second: 59,
}
const MIN: Record<NumericPart, number> = {
  year: 1,
  month: 1,
  day: 1,
  hour: 0,
  minute: 0,
  second: 0,
}

function toParts(value: DateValue | TimeValue | undefined): Parts {
  if (!value) return {}
  const parts: Parts = {}
  for (const key of Object.keys(MAX) as NumericPart[]) {
    if (key in value) parts[key] = (value as unknown as Record<string, number>)[key]
  }
  return parts
}

function wantedParts(kind: "date" | "time", granularity: Granularity): NumericPart[] {
  const time: NumericPart[] = ["hour", "minute", "second"]
  const timeParts =
    granularity === "day" ? [] : time.slice(0, time.indexOf(granularity as NumericPart) + 1)
  if (kind === "time") return timeParts.length ? timeParts : ["hour", "minute"]
  return ["year", "month", "day", ...timeParts]
}

function build(kind: "date" | "time", wanted: NumericPart[], p: Parts) {
  if (wanted.some((key) => p[key] === undefined)) return undefined
  const { year = 1, month = 1, day = 1, hour = 0, minute = 0, second = 0 } = p
  if (kind === "time") return new Time(hour, minute, second)
  if (!wanted.includes("hour")) return new CalendarDate(year, month, day)
  return new CalendarDateTime(year, month, day, hour, minute, second)
}

/** Segmented, keyboard-editable date or time field state built on locale-aware part order. */
export function useDateField<T extends DateValue | TimeValue>({
  value,
  onChange,
  kind,
  granularity = kind === "time" ? "minute" : "day",
  locale,
  hourCycle,
  disabled = false,
}: Options<T>): DateFieldSegment[] {
  const [parts, setParts] = useState<Parts>(() => toParts(value))
  // Compared as strings: callers often pass a fresh but equal date object on every render.
  const [synced, setSynced] = useState(String(value))
  const [buffer, setBuffer] = useState("")
  const wanted = wantedParts(kind, granularity)
  // Resync from outside changes, but keep half-typed parts when the parent echoes our own clear.
  if (synced !== String(value)) {
    setSynced(String(value))
    if (String(build(kind, wanted, parts)) !== String(value)) setParts(toParts(value))
  }

  const hour12 = hourCycle === 12 || (hourCycle === undefined && usesHour12(locale))
  const order = new Intl.DateTimeFormat(locale, {
    ...(wanted.includes("year") ? { year: "numeric", month: "2-digit", day: "2-digit" } : {}),
    ...(wanted.includes("hour") ? { hour: "2-digit", minute: "2-digit" } : {}),
    ...(wanted.includes("second") ? { second: "2-digit" } : {}),
    ...(wanted.includes("hour") ? { hourCycle: hour12 ? "h12" : "h23" } : {}),
  }).formatToParts(new Date(2000, 0, 1, 13, 0, 0))

  function commit(next: Parts) {
    setParts(next)
    const built = build(kind, wanted, next)
    if (built || value) onChange(built as T | undefined)
  }

  function onKeyDown(part: SegmentPart, event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Tab") return
    event.preventDefault()
    if (disabled) return
    const fields = [
      ...(event.currentTarget.parentElement?.querySelectorAll<HTMLElement>("[contenteditable]") ??
        []),
    ]
    const move = (step: number) => fields[fields.indexOf(event.currentTarget) + step]?.focus()
    if (event.key === "ArrowLeft") return move(-1)
    if (event.key === "ArrowRight") return move(1)
    if (part === "dayPeriod") {
      const hour = parts.hour
      if (hour === undefined) return
      const pm = event.key.toLowerCase() === "p" || (event.key.startsWith("Arrow") && hour < 12)
      const am = event.key.toLowerCase() === "a" || (event.key.startsWith("Arrow") && hour >= 12)
      if (pm || am) commit({ ...parts, hour: (hour % 12) + (pm ? 12 : 0) })
      return
    }
    const current = parts[part]
    if (event.key === "Backspace" || event.key === "Delete") {
      setBuffer("")
      return commit({ ...parts, [part]: undefined })
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const step = event.key === "ArrowUp" ? 1 : -1
      const span = MAX[part] - MIN[part] + 1
      const next =
        current === undefined ? MIN[part] : ((current - MIN[part] + step + span) % span) + MIN[part]
      return commit({ ...parts, [part]: next })
    }
    if (!/^\d$/.test(event.key)) return
    const digits = buffer + event.key
    const max = part === "hour" && hour12 ? 12 : MAX[part]
    let typed = Number(digits)
    if (part === "hour" && hour12) typed = (typed % 12) + ((current ?? 0) >= 12 ? 12 : 0)
    const done = digits.length >= String(MAX[part]).length || Number(digits) * 10 > max
    setBuffer(done ? "" : digits)
    commit({ ...parts, [part]: typed })
    if (done) move(1)
  }

  return order.map(({ type, value: literal }) => {
    if (type === "literal" || !(type in DEFAULT_PLACEHOLDERS))
      return { part: "literal", value: literal }
    const part = type as SegmentPart
    const placeholder =
      PLACEHOLDERS[locale.split("-")[0] ?? ""]?.[part] ?? DEFAULT_PLACEHOLDERS[part]
    const hour = parts.hour
    const raw = part === "dayPeriod" ? undefined : parts[part]
    let text = placeholder
    if (part === "dayPeriod") {
      if (hour !== undefined) text = dayPeriod(locale, hour)
    } else if (raw !== undefined) {
      const shown = part === "hour" && hour12 ? raw % 12 || 12 : raw
      text = String(shown).padStart(part === "year" ? 4 : 2, "0")
    }
    return {
      part,
      value: text,
      props: {
        role: "spinbutton",
        "aria-label": part,
        "aria-valuenow": raw,
        "aria-valuemin": part === "dayPeriod" ? undefined : MIN[part],
        "aria-valuemax": part === "dayPeriod" ? undefined : MAX[part],
        "aria-disabled": disabled || undefined,
        "data-disabled": disabled ? "" : undefined,
        contentEditable: !disabled,
        suppressContentEditableWarning: true,
        inputMode: "numeric",
        tabIndex: disabled ? -1 : 0,
        onBlur: () => setBuffer(""),
        onKeyDown: (event: KeyboardEvent<HTMLElement>) => onKeyDown(part, event),
      },
    }
  })
}

function usesHour12(locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hour12 === true
}

function dayPeriod(locale: string, hour: number) {
  return (
    new Intl.DateTimeFormat(locale, { hour: "numeric", hourCycle: "h12" })
      .formatToParts(new Date(2000, 0, 1, hour))
      .find((p) => p.type === "dayPeriod")?.value ?? (hour < 12 ? "AM" : "PM")
  )
}
