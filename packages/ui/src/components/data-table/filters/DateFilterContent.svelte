<script lang="ts">
import type { DateValue } from "@internationalized/date"
import { cn } from "../../../utils/cn"
import DatePicker from "../../date-picker/DatePicker.svelte"
import Label from "../../label/Label.svelte"
import { fromDateValue, toDateValue } from "../date-utils"
import type { DataTableDateComparisonOperator, DataTableFilterOption } from "../filter-types"

type Props = {
  filter: unknown
  options: DataTableFilterOption<DataTableDateComparisonOperator>[]
  isCustomRange: boolean
  format?: "date" | "date-time"
  rangeOptionLabel?: string
  rangeOptionStartLabel?: string
  rangeOptionEndLabel?: string
  disableRangeOption?: boolean
  onUpdate: (value: unknown) => void
}

let {
  filter,
  options,
  isCustomRange,
  format = "date",
  rangeOptionLabel = "Custom",
  rangeOptionStartLabel = "Starting",
  rangeOptionEndLabel = "Ending",
  disableRangeOption = false,
  onUpdate,
}: Props = $props()

const current = $derived(filter as DataTableDateComparisonOperator | undefined)
const granularity = $derived(format === "date-time" ? "minute" : "day")
// Özel aralık seçimi başlangıçta dışarıdan gelen değerle belirlenir.
// svelte-ignore state_referenced_locally
let isCustom = $state(isCustomRange)

$effect(() => {
  isCustom = isCustomRange
})

const selectedValue = $derived.by(() => {
  if (!current || isCustom) return undefined
  return JSON.stringify(current)
})

const startValue = $derived(toDateValue(current?.$gte, granularity))
const endValue = $derived(toDateValue(current?.$lte, granularity))
const minDate = $derived(toDateValue(current?.$gte, granularity))
const maxDate = $derived(toDateValue(current?.$lte, granularity))

function selectValue(value: DataTableDateComparisonOperator) {
  isCustom = false
  onUpdate(value)
}

function changeRange(key: "$gte" | "$lte", value: DateValue | undefined) {
  const next: DataTableDateComparisonOperator = { ...current }
  next[key] = fromDateValue(value)
  onUpdate(next)
}
</script>

<div class="flex flex-col">
  <div class="flex flex-col p-1 outline-hidden">
    {#each options as option, index (index)}
      {@const isSelected = selectedValue === JSON.stringify(option.value)}
      <button
        type="button"
       
        aria-pressed={isSelected}
        onclick={() => selectValue(option.value)}
        class={cn(
          "txt-compact-small transition-fg flex items-center gap-2 rounded px-2 py-1",
          "hover:bg-bg-component-hover",
        )}
      >
        <span class="flex size-[15px] shrink-0 items-center justify-center">
          {#if isSelected}<span class="size-2 rounded-full bg-foreground"></span>{/if}
        </span>
        <span class="min-w-0 truncate">{option.label}</span>
      </button>
    {/each}

    {#if !disableRangeOption}
      <button
        type="button"
       
        aria-pressed={isCustom}
        onclick={() => (isCustom = true)}
        class={cn(
          "txt-compact-small transition-fg flex items-center gap-2 rounded px-2 py-1",
          "hover:bg-bg-component-hover",
        )}
      >
        <span class="flex size-[15px] shrink-0 items-center justify-center">
          {#if isCustom}<span class="size-2 rounded-full bg-foreground"></span>{/if}
        </span>
        <span class="min-w-0 truncate">{rangeOptionLabel}</span>
      </button>
    {/if}
  </div>

  {#if !disableRangeOption && isCustom}
    <div class="flex flex-col py-[3px]">
      <div class="h-px w-full bg-border-menu-top"></div>
      <div class="h-px w-full bg-border-menu-bot"></div>
    </div>
    <div class="flex flex-col gap-2 px-2 pb-3 pt-1">
      <div class="flex flex-col gap-1">
        <Label size="xsmall" weight="plus">{rangeOptionStartLabel}</Label>
        <DatePicker
          aria-label={rangeOptionStartLabel}
          {granularity}
          maxValue={maxDate}
          value={startValue}
          onValueChange={(value) => changeRange("$gte", value)}
        />
      </div>
      <div class="flex flex-col gap-1">
        <Label size="xsmall" weight="plus">{rangeOptionEndLabel}</Label>
        <DatePicker
          aria-label={rangeOptionEndLabel}
          {granularity}
          minValue={minDate}
          value={endValue}
          onValueChange={(value) => changeRange("$lte", value)}
        />
      </div>
    </div>
  {/if}
</div>
