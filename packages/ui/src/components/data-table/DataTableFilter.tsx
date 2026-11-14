import { X } from "lucide-react"
import { type ReactNode, useState } from "react"
import { cn } from "../../utils/cn"
import { Popover, PopoverContent, PopoverTrigger } from "../popover/Popover"
import { useDataTableContext } from "./context"
import type {
  DataTableBooleanFilterProps,
  DataTableCustomFilterProps,
  DataTableDateComparisonOperator,
  DataTableDateFilterProps,
  DataTableFilterOption,
  DataTableNumberFilterProps,
  DataTableNumberRangeFilterProps,
  DataTableSelectFilterProps,
  DataTableStringFilterProps,
} from "./filter-types"
import { getFilterDisplayValue, isDateComparisonOperator } from "./filter-utils"
import { DateFilterContent } from "./filters/DateFilterContent"
import {
  NumberFilterContent,
  NumberRangeFilterContent,
  StringFilterContent,
} from "./filters/InputFilterContents"
import {
  BooleanFilterContent,
  CustomFilterContent,
  MultiselectFilterContent,
  RadioFilterContent,
  SelectFilterContent,
} from "./filters/OptionFilterContents"

function hasFilterValue(filter: unknown) {
  if (filter === null || filter === undefined) return false
  if (typeof filter === "string" && filter === "") return false
  if (Array.isArray(filter) && filter.length === 0) return false
  if (typeof filter === "number" || typeof filter === "boolean") return true
  if (isDateComparisonOperator(filter)) {
    return Boolean(filter.$gte || filter.$lte || filter.$gt || filter.$lt)
  }
  if (typeof filter === "object") return Object.keys(filter).length > 0
  return true
}

const TRIGGER_BASE = "outline-hidden transition-fg hover:bg-accent active:bg-bg-base-pressed"

export function DataTableFilterItem({
  id,
  filter,
  isNew = false,
  onUpdate,
  onRemove,
}: {
  id: string
  filter: unknown
  isNew?: boolean
  onUpdate?: (value: unknown) => void
  onRemove?: () => void
}) {
  const instance = useDataTableContext()
  const meta = instance.getFilterMeta(id)
  // A new filter starts open so the user can pick a value.
  const [open, setOpen] = useState(isNew)
  const [wasNew, setWasNew] = useState(isNew)
  if (isNew !== wasNew) {
    setWasNew(isNew)
    if (isNew) setOpen(true)
  }
  if (!meta) return null

  const hasValue = hasFilterValue(filter)
  const display = getFilterDisplayValue(meta, filter)
  const label = meta.label || id
  const update = (value: unknown) =>
    onUpdate ? onUpdate(value) : instance.updateFilter({ id, value })
  const remove = () => (onRemove ? onRemove() : instance.removeFilter(id))

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next && !hasValue) remove()
  }

  let content: ReactNode = null
  if (meta.type === "select" || meta.type === "multiselect" || meta.type === "radio") {
    const options = (meta as DataTableSelectFilterProps).options
    if (meta.type === "select") {
      content = (
        <SelectFilterContent options={options} value={filter as string[]} onUpdate={update} />
      )
    } else if (meta.type === "multiselect") {
      content = (
        <MultiselectFilterContent
          options={options}
          value={filter as string[]}
          searchable={(meta as { searchable?: boolean }).searchable}
          onUpdate={update}
        />
      )
    } else {
      content = <RadioFilterContent options={options} value={filter} onUpdate={update} />
    }
  } else if (meta.type === "date") {
    const dateMeta = meta as DataTableDateFilterProps
    content = (
      <DateFilterContent
        filter={filter}
        options={dateMeta.options as DataTableFilterOption<DataTableDateComparisonOperator>[]}
        isCustomRange={display.isCustomRange}
        format={dateMeta.format}
        rangeOptionLabel={dateMeta.rangeOptionLabel}
        rangeOptionStartLabel={dateMeta.rangeOptionStartLabel}
        rangeOptionEndLabel={dateMeta.rangeOptionEndLabel}
        disableRangeOption={dateMeta.disableRangeOption}
        onUpdate={update}
      />
    )
  } else if (meta.type === "string") {
    content = (
      <StringFilterContent
        value={filter as string | undefined}
        placeholder={(meta as DataTableStringFilterProps).placeholder}
        onUpdate={update}
      />
    )
  } else if (meta.type === "number") {
    content = (
      <NumberFilterContent
        filter={filter}
        placeholder={(meta as DataTableNumberFilterProps).placeholder}
        includeOperators={(meta as DataTableNumberFilterProps).includeOperators}
        onUpdate={update}
      />
    )
  } else if (meta.type === "number-range") {
    content = (
      <NumberRangeFilterContent
        filter={filter}
        placeholder={(meta as DataTableNumberRangeFilterProps).placeholder}
        onUpdate={update}
      />
    )
  } else if (meta.type === "boolean") {
    content = (
      <BooleanFilterContent
        filter={filter}
        labels={meta as DataTableBooleanFilterProps}
        onUpdate={update}
      />
    )
  } else if (meta.type === "custom") {
    content = (
      <CustomFilterContent
        filter={filter}
        render={(meta as DataTableCustomFilterProps).render}
        onUpdate={update}
        onRemove={remove}
      />
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <div className="flex shrink-0 items-stretch overflow-hidden rounded-md bg-bg-field txt-compact-small-plus shadow-borders-base">
        <div className={cn("flex items-center px-2 py-1 text-fg-muted", { "border-r": hasValue })}>
          {label}
        </div>
        {hasValue ? (
          <>
            {(meta.type === "select" || meta.type === "multiselect" || meta.type === "radio") && (
              <div className="flex items-center border-r px-2 py-1 text-fg-muted">is</div>
            )}
            <PopoverTrigger
              className={cn("flex flex-1 items-center border-r px-2 py-1", TRIGGER_BASE, {
                "text-muted-foreground": display.displayValue,
                "text-fg-muted": !display.displayValue,
              })}
            >
              {display.displayValue ?? " "}
            </PopoverTrigger>
            <button
              type="button"
              aria-label={`Remove ${label} filter`}
              className={cn("flex size-7 items-center justify-center text-fg-muted", TRIGGER_BASE)}
              onClick={remove}
            >
              <X aria-hidden="true" />
            </button>
          </>
        ) : (
          <PopoverTrigger
            aria-label={`Set ${label} filter`}
            className={cn(
              "flex min-w-[80px] flex-1 items-center justify-center px-2 py-1 text-fg-muted",
              TRIGGER_BASE,
            )}
          >
            {" "}
          </PopoverTrigger>
        )}
      </div>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="bg-popover p-0 outline-hidden"
        // The filter menu returns focus to its trigger as a new filter opens; that must not close it.
        onFocusOutside={(event) => event.preventDefault()}
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}
