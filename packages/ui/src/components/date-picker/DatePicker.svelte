<script lang="ts">
import type { DateValue } from "@internationalized/date"
import CalendarMini from "@lucide/svelte/icons/calendar"
import XMarkMini from "@lucide/svelte/icons/x"
import { DatePicker as DatePickerPrimitive } from "bits-ui"
import { cn } from "../../utils/cn"
import CalendarGrid from "../calendar/CalendarGrid.svelte"
import CalendarHeader from "../calendar/CalendarHeader.svelte"
import DateSegment from "../date-segment/DateSegment.svelte"
import {
  datePickerButtonVariants,
  datePickerClearButtonVariants,
  datePickerContentVariants,
  datePickerGroupVariants,
  datePickerPanelVariants,
} from "./variants"

type Props = {
  value?: DateValue
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
  granularity?: "day" | "hour" | "minute" | "second"
  locale?: string
  size?: "base" | "small"
  disabled?: boolean
  class?: string
  "aria-label"?: string
}

let {
  value = $bindable(undefined),
  onValueChange,
  placeholder,
  open = $bindable(false),
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
  class: className,
  "aria-label": ariaLabel = "Date input",
}: Props = $props()

$effect(() => {
  if (defaultOpen) open = true
})

const groupClass = $derived(
  datePickerGroupVariants({ size, hasValue: Boolean(value), isOpen: open }),
)
</script>

<DatePickerPrimitive.Root
  bind:value
  bind:open
  {onValueChange}
  {onOpenChange}
  {placeholder}
  {minValue}
  {maxValue}
  {isDateUnavailable}
  {granularity}
  {locale}
  {disabled}
  closeOnDateSelect={shouldCloseOnSelect}
>
  <div class={cn(groupClass, className)}>
    <DatePickerPrimitive.Trigger
      class={cn(datePickerButtonVariants({ size }))}
      aria-label="Open calendar"
    >
      <CalendarMini />
    </DatePickerPrimitive.Trigger>
    <DatePickerPrimitive.Input aria-label={ariaLabel}>
      {#snippet children({ segments })}
        {#each segments as segment, index (index)}
          <DateSegment part={segment.part} value={segment.value} />
        {/each}
      {/snippet}
    </DatePickerPrimitive.Input>
    {#if value}
      <button
        type="button"
        class={cn(datePickerClearButtonVariants())}
        aria-label="Clear date"
        onclick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          value = undefined
          onValueChange?.(undefined)
        }}
      >
        <XMarkMini />
      </button>
    {/if}
  </div>

  <DatePickerPrimitive.Content class={cn(datePickerContentVariants())}>
    <DatePickerPrimitive.Calendar>
      {#snippet children({ months, weekdays })}
        <div class={cn(datePickerPanelVariants(), "flex flex-col gap-y-2")}>
          <CalendarHeader />
          {#each months as month}
            <CalendarGrid {month} {weekdays} />
          {/each}
        </div>
      {/snippet}
    </DatePickerPrimitive.Calendar>
  </DatePickerPrimitive.Content>
</DatePickerPrimitive.Root>
