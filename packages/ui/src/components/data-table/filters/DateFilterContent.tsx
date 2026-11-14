import type { DateValue } from "@internationalized/date"
import { useState } from "react"
import { DatePicker } from "../../date-picker/DatePicker"
import { Label } from "../../label/Label"
import { fromDateValue, toDateValue } from "../date-utils"
import type { DataTableDateComparisonOperator, DataTableFilterOption } from "../filter-types"
import { ChoiceOption } from "./OptionFilterContents"

export function DateFilterContent({
  filter,
  options,
  isCustomRange,
  format = "date",
  rangeOptionLabel = "Custom",
  rangeOptionStartLabel = "Starting",
  rangeOptionEndLabel = "Ending",
  disableRangeOption = false,
  onUpdate,
}: {
  filter: unknown
  options: DataTableFilterOption<DataTableDateComparisonOperator>[]
  isCustomRange: boolean
  format?: "date" | "date-time"
  rangeOptionLabel?: string
  rangeOptionStartLabel?: string
  rangeOptionEndLabel?: string
  disableRangeOption?: boolean
  onUpdate: (value: unknown) => void
}) {
  const current = filter as DataTableDateComparisonOperator | undefined
  const granularity = format === "date-time" ? "minute" : "day"
  // The custom range selection follows the incoming value.
  const [isCustom, setIsCustom] = useState(isCustomRange)
  const [synced, setSynced] = useState(isCustomRange)
  if (synced !== isCustomRange) {
    setSynced(isCustomRange)
    setIsCustom(isCustomRange)
  }

  const selectedValue = !current || isCustom ? undefined : JSON.stringify(current)
  const start = toDateValue(current?.$gte, granularity)
  const end = toDateValue(current?.$lte, granularity)

  function changeRange(key: "$gte" | "$lte", value: DateValue | undefined) {
    onUpdate({ ...current, [key]: fromDateValue(value) })
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col p-1 outline-hidden">
        {options.map((option, index) => (
          <ChoiceOption
            // biome-ignore lint/suspicious/noArrayIndexKey: preset values are objects without ids
            key={index}
            selected={selectedValue === JSON.stringify(option.value)}
            label={option.label}
            onClick={() => {
              setIsCustom(false)
              onUpdate(option.value)
            }}
          />
        ))}
        {!disableRangeOption && (
          <ChoiceOption
            selected={isCustom}
            label={rangeOptionLabel}
            onClick={() => setIsCustom(true)}
          />
        )}
      </div>
      {!disableRangeOption && isCustom && (
        <>
          <div className="flex flex-col py-[3px]">
            <div className="h-px w-full bg-border-menu-top" />
            <div className="h-px w-full bg-border-menu-bot" />
          </div>
          <div className="flex flex-col gap-2 px-2 pb-3 pt-1">
            <div className="flex flex-col gap-1">
              <Label size="xsmall" weight="plus">
                {rangeOptionStartLabel}
              </Label>
              <DatePicker
                aria-label={rangeOptionStartLabel}
                granularity={granularity}
                maxValue={end}
                value={start}
                onValueChange={(value) => changeRange("$gte", value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label size="xsmall" weight="plus">
                {rangeOptionEndLabel}
              </Label>
              <DatePicker
                aria-label={rangeOptionEndLabel}
                granularity={granularity}
                minValue={start}
                value={end}
                onValueChange={(value) => changeRange("$lte", value)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
