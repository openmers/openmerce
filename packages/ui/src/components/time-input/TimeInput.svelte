<script lang="ts">
import type { TimeValue } from "bits-ui"
import { TimeField as TimeFieldPrimitive } from "bits-ui"
import { cn } from "../../utils/cn"
import DateSegment from "../date-segment/DateSegment.svelte"
import { timeInputVariants } from "./variants"

type Props = {
  value?: TimeValue
  onChange?: (value: TimeValue | undefined) => void
  hourCycle?: 12 | 24
  locale?: string
  isDisabled?: boolean
  class?: string
  "aria-label"?: string
}

let {
  value = $bindable(undefined),
  onChange,
  hourCycle,
  locale = "tr",
  isDisabled = false,
  class: className,
  "aria-label": ariaLabel = "Time input",
}: Props = $props()
</script>

<TimeFieldPrimitive.Root
  bind:value
  {hourCycle}
  {locale}
  disabled={isDisabled}
  onValueChange={(next) => onChange?.(next)}
>
  <TimeFieldPrimitive.Input
    aria-label={ariaLabel}
    class={cn(timeInputVariants({ isDisabled }), className)}
  >
    {#snippet children({ segments })}
      {#each segments as segment, index (index)}
        <DateSegment part={segment.part} value={segment.value} field="time" />
      {/each}
    {/snippet}
  </TimeFieldPrimitive.Input>
</TimeFieldPrimitive.Root>
