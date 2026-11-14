import { useEffect, useRef, useState } from "react"
import { Input } from "../../input/Input"
import { Label } from "../../label/Label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../select/Select"
import type { DataTableNumberComparisonOperator } from "../filter-types"

const DEBOUNCE_MS = 500

/** A timer that is cleared on unmount, for debounced filter commits. */
function useDebounce() {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  return (run: (() => void) | null) => {
    clearTimeout(timer.current)
    if (run) timer.current = setTimeout(run, DEBOUNCE_MS)
  }
}

/** Local draft state that resets whenever the incoming value changes. */
function useDraft<T>(incoming: T) {
  const [draft, setDraft] = useState(incoming)
  const [synced, setSynced] = useState(incoming)
  if (synced !== incoming) {
    setSynced(incoming)
    setDraft(incoming)
  }
  return [draft, setDraft] as const
}

export function StringFilterContent({
  value: initialValue,
  placeholder = "Enter value...",
  onUpdate,
}: {
  value?: string
  placeholder?: string
  onUpdate: (value: unknown) => void
}) {
  const [value, setValue] = useDraft(initialValue ?? "")
  const debounce = useDebounce()
  const commit = (next: string) => {
    debounce(null)
    onUpdate(next.trim() || undefined)
  }
  return (
    <div className="w-[250px] p-3">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          const next = event.currentTarget.value
          setValue(next)
          debounce(() => commit(next))
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit(value)
        }}
      />
    </div>
  )
}

const OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater than or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less than or equal" },
]

function parseNumberFilter(filter: unknown) {
  if (typeof filter === "number") return { operator: "eq", value: String(filter) }
  if (filter && typeof filter === "object") {
    const key = Object.keys(filter)[0] ?? "$eq"
    return {
      operator: key.replace("$", ""),
      value: String((filter as Record<string, unknown>)[key]),
    }
  }
  return { operator: "eq", value: "" }
}

export function NumberFilterContent({
  filter,
  placeholder = "Enter number...",
  includeOperators = true,
  onUpdate,
}: {
  filter: unknown
  placeholder?: string
  includeOperators?: boolean
  onUpdate: (value: unknown) => void
}) {
  const parsed = parseNumberFilter(filter)
  const [operator, setOperator] = useDraft(parsed.operator)
  const [value, setValue] = useDraft(parsed.value)
  const debounce = useDebounce()

  function commit(nextValue: string, nextOperator: string) {
    const number = Number.parseFloat(nextValue)
    if (Number.isNaN(number)) {
      if (nextValue === "") onUpdate(undefined)
      return
    }
    onUpdate(includeOperators && nextOperator !== "eq" ? { [`$${nextOperator}`]: number } : number)
  }

  return (
    <div className="flex w-[250px] flex-col gap-3 p-3">
      {includeOperators && (
        <Select
          value={operator}
          onValueChange={(next) => {
            setOperator(next)
            commit(value, next)
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATORS.map((entry) => (
              <SelectItem key={entry.value} value={entry.value}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Input
        type="number"
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          const next = event.currentTarget.value
          setValue(next)
          debounce(() => commit(next, operator))
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit(value, operator)
        }}
        autoFocus={!includeOperators}
      />
    </div>
  )
}

export function NumberRangeFilterContent({
  filter,
  placeholder = "Enter number...",
  onUpdate,
}: {
  filter: unknown
  placeholder?: string
  onUpdate: (value: unknown) => void
}) {
  const current = (
    filter && typeof filter === "object" ? filter : {}
  ) as DataTableNumberComparisonOperator
  const [min, setMin] = useDraft(current.$gte !== undefined ? String(current.$gte) : "")
  const [max, setMax] = useDraft(current.$lte !== undefined ? String(current.$lte) : "")
  const debounce = useDebounce()

  function schedule(nextMin: string, nextMax: string) {
    debounce(() => {
      const next: DataTableNumberComparisonOperator = {}
      if (nextMin !== "") next.$gte = Number.parseFloat(nextMin)
      if (nextMax !== "") next.$lte = Number.parseFloat(nextMax)
      onUpdate(Object.keys(next).length > 0 ? next : undefined)
    })
  }

  return (
    <div className="flex w-[250px] flex-col gap-3 p-3">
      <div className="flex flex-col gap-1">
        <Label size="xsmall" weight="plus" htmlFor="data-table-range-min">
          Min
        </Label>
        <Input
          id="data-table-range-min"
          type="number"
          placeholder={placeholder}
          value={min}
          onChange={(event) => {
            setMin(event.currentTarget.value)
            schedule(event.currentTarget.value, max)
          }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label size="xsmall" weight="plus" htmlFor="data-table-range-max">
          Max
        </Label>
        <Input
          id="data-table-range-max"
          type="number"
          placeholder={placeholder}
          value={max}
          onChange={(event) => {
            setMax(event.currentTarget.value)
            schedule(min, event.currentTarget.value)
          }}
        />
      </div>
    </div>
  )
}
