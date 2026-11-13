<script lang="ts">
import { Calendar as CalendarPrimitive } from "bits-ui"
import { cn } from "../../utils/cn"
import CalendarNextButton from "./CalendarNextButton.svelte"
import CalendarPrevButton from "./CalendarPrevButton.svelte"
import { calendarHeaderVariants, calendarHeadingVariants } from "./variants"

type Props = {
  class?: string
}

let { class: className }: Props = $props()
</script>

<CalendarPrimitive.Header class={cn(calendarHeaderVariants(), className)}>
  <CalendarPrevButton />
  <div class="flex items-center justify-center">
    <CalendarPrimitive.Heading class={cn(calendarHeadingVariants())} />
  </div>
  <CalendarNextButton />
</CalendarPrimitive.Header>
