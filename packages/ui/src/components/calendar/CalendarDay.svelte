<script lang="ts">
import { type DateValue, getLocalTimeZone, today } from "@internationalized/date"
import { Calendar as CalendarPrimitive } from "bits-ui"
import { cn } from "../../utils/cn"
import {
  calendarDayVariants,
  calendarTodayDotSelectedVariants,
  calendarTodayDotVariants,
} from "./variants"

type Props = {
  date: DateValue
  class?: string
}

let { date, class: className }: Props = $props()

const isToday = $derived(date.compare(today(getLocalTimeZone())) === 0)
</script>

<CalendarPrimitive.Day class={cn(calendarDayVariants(), className)}>
  {#snippet children({ selected })}
    {date.day}
    {#if isToday}
      <div
        role="none"
        class={cn(
          calendarTodayDotVariants(),
          selected && calendarTodayDotSelectedVariants(),
        )}
      ></div>
    {/if}
  {/snippet}
</CalendarPrimitive.Day>
