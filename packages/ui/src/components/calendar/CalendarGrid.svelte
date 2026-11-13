<script lang="ts">
import type { DateValue } from "@internationalized/date"
import type { Month } from "bits-ui"
import { Calendar as CalendarPrimitive } from "bits-ui"
import { cn } from "../../utils/cn"
import CalendarDay from "./CalendarDay.svelte"
import { calendarCellVariants, calendarHeadCellVariants } from "./variants"

type Props = {
  month: Month<DateValue>
  weekdays: string[]
  class?: string
}

let { month, weekdays, class: className }: Props = $props()
</script>

<CalendarPrimitive.Grid class={cn(className)}>
  <CalendarPrimitive.GridHead>
    <CalendarPrimitive.GridRow>
      {#each weekdays as weekday}
        <CalendarPrimitive.HeadCell class={cn(calendarHeadCellVariants())}>
          {weekday}
        </CalendarPrimitive.HeadCell>
      {/each}
    </CalendarPrimitive.GridRow>
  </CalendarPrimitive.GridHead>
  <CalendarPrimitive.GridBody>
    {#each month.weeks as week}
      <CalendarPrimitive.GridRow>
        {#each week as date}
          <CalendarPrimitive.Cell {date} month={month.value} class={cn(calendarCellVariants())}>
            <CalendarDay {date} />
          </CalendarPrimitive.Cell>
        {/each}
      </CalendarPrimitive.GridRow>
    {/each}
  </CalendarPrimitive.GridBody>
</CalendarPrimitive.Grid>
