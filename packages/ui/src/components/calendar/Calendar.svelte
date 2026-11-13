<script lang="ts">
import type { DateValue } from "@internationalized/date"
import { Calendar as CalendarPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import CalendarGrid from "./CalendarGrid.svelte"
import CalendarHeader from "./CalendarHeader.svelte"
import { calendarVariants } from "./variants"

type Props = CalendarPrimitive.RootProps & {
  children?: Snippet
  value?: DateValue
  onValueChange?: (value: DateValue | undefined) => void
}

let { class: className, value = $bindable(undefined), children, ...rest }: Props = $props()
</script>

<CalendarPrimitive.Root
  type="single"
  bind:value
  class={cn(calendarVariants(), className)}
  {...rest}
>
  {#snippet children({ months, weekdays })}
    {@render children?.()}
    <CalendarHeader />
    {#each months as month}
      <CalendarGrid {month} {weekdays} />
    {/each}
  {/snippet}
</CalendarPrimitive.Root>
