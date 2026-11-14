import { Check, Search, X } from "lucide-react"
import { type ReactNode, useState } from "react"
import { cn } from "../../../utils/cn"
import { Checkbox } from "../../checkbox/Checkbox"
import type {
  DataTableBooleanFilterProps,
  DataTableCustomFilterRenderProps,
  DataTableFilterOption,
} from "../filter-types"
import type { DataTableRenderedContent } from "../types"

const OPTION =
  "txt-compact-small transition-fg flex items-center gap-2 rounded px-2 py-1 hover:bg-bg-component-hover"

/** One single-choice row with the dot marker, shared by the radio, boolean and date filters. */
export function ChoiceOption({
  selected,
  label,
  onClick,
  className,
}: {
  selected: boolean
  label: ReactNode
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(OPTION, className)}
    >
      <span className="flex size-[15px] shrink-0 items-center justify-center">
        {selected && <span className="size-2 rounded-full bg-foreground" />}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </button>
  )
}

export function BooleanFilterContent({
  filter,
  labels,
  onUpdate,
}: {
  filter: unknown
  labels?: Pick<DataTableBooleanFilterProps, "trueLabel" | "falseLabel">
  onUpdate: (value: unknown) => void
}) {
  const options = [
    { value: true, label: labels?.trueLabel ?? "True" },
    { value: false, label: labels?.falseLabel ?? "False" },
  ]
  return (
    <div className="flex flex-col p-1">
      {options.map((option) => (
        <ChoiceOption
          key={String(option.value)}
          selected={filter === option.value}
          label={option.label}
          onClick={() => onUpdate(option.value)}
        />
      ))}
    </div>
  )
}

export function RadioFilterContent({
  value,
  options,
  onUpdate,
}: {
  value: unknown
  options: DataTableFilterOption[]
  onUpdate: (value: unknown) => void
}) {
  return (
    <div className="flex flex-col p-1 outline-hidden">
      {options.map((option) => (
        <ChoiceOption
          key={option.value}
          className="outline-hidden"
          selected={value === option.value}
          label={option.label}
          onClick={() => onUpdate(option.value)}
        />
      ))}
    </div>
  )
}

function SearchableOptions({
  value = [],
  options,
  searchable = true,
  onUpdate,
  marker,
}: {
  value?: string[]
  options: DataTableFilterOption[]
  searchable?: boolean
  onUpdate: (value: unknown) => void
  marker: (selected: boolean) => ReactNode
}) {
  const [search, setSearch] = useState("")
  const filtered =
    searchable && search
      ? options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase()))
      : options

  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      const next = value.filter((entry) => entry !== optionValue)
      onUpdate(next.length > 0 ? next : undefined)
      return
    }
    onUpdate([...value, optionValue])
  }

  return (
    <div className="w-[250px]">
      {searchable && (
        <div className="flex items-center gap-x-2 border-b px-3 py-1.5">
          <Search className="size-4 text-fg-muted" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search..."
            aria-label="Search options"
            className="h-8 flex-1 bg-transparent text-sm outline-hidden placeholder:text-fg-muted"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              className="text-fg-muted hover:text-muted-foreground"
              onClick={() => setSearch("")}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      <div className="max-h-[300px] overflow-auto p-1">
        {filtered.length === 0 && (
          <div className="py-6 text-center text-sm text-fg-muted">No results found</div>
        )}
        {filtered.map((option) => {
          const selected = value.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(option.value)}
              className="flex w-full cursor-pointer items-center gap-x-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              {marker(selected)}
              <span className="min-w-0 truncate">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

type MultiProps = {
  value?: string[]
  options: DataTableFilterOption[]
  onUpdate: (value: unknown) => void
}

export function SelectFilterContent(props: MultiProps) {
  return (
    <SearchableOptions
      {...props}
      marker={(selected) => (
        <span className="flex size-[15px] shrink-0 items-center justify-center">
          {selected && <Check aria-hidden="true" />}
        </span>
      )}
    />
  )
}

export function MultiselectFilterContent(props: MultiProps & { searchable?: boolean }) {
  return (
    <SearchableOptions
      {...props}
      marker={(selected) => (
        <Checkbox checked={selected} className="pointer-events-none shrink-0" tabIndex={-1} />
      )}
    />
  )
}

export function CustomFilterContent({
  render,
  filter,
  onUpdate,
  onRemove,
}: {
  render: (props: DataTableCustomFilterRenderProps) => DataTableRenderedContent
  filter: unknown
  onUpdate: (value: unknown) => void
  onRemove: () => void
}) {
  return (
    <div className="min-w-[250px]">{render({ value: filter, onChange: onUpdate, onRemove })}</div>
  )
}
