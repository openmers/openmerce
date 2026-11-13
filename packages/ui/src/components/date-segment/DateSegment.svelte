<script lang="ts">
import type { SegmentPart } from "bits-ui"
import { DateField as DateFieldPrimitive, TimeField as TimeFieldPrimitive } from "bits-ui"
import { cn } from "../../utils/cn"
import {
  dateSegmentLiteralVariants,
  dateSegmentPlaceholderVariants,
  dateSegmentVariants,
} from "./variants"

type Props = {
  part: SegmentPart
  value: string
  /** DateField and TimeField use separate contexts; the segment component is chosen accordingly. */
  field?: "date" | "time"
  class?: string
}

let { part, value, field = "date", class: className }: Props = $props()

// bits-ui does not emit `isPlaceholder`; empty parts are shown with format letters ("mm", "dd"...).
const isEmpty = $derived(part !== "dayPeriod" && value.trim() !== "" && !/\d/.test(value))
</script>

{#snippet content()}
  <span class={cn(isEmpty && dateSegmentPlaceholderVariants())}>{value}</span>
{/snippet}

{#if part === "literal"}
  <span class={cn(dateSegmentLiteralVariants())}>{value.trim() === "," ? "" : value}</span>
{:else if field === "time"}
  <TimeFieldPrimitive.Segment {part} class={cn(dateSegmentVariants(), className)}>
    {@render content()}
  </TimeFieldPrimitive.Segment>
{:else}
  <DateFieldPrimitive.Segment {part} class={cn(dateSegmentVariants(), className)}>
    {@render content()}
  </DateFieldPrimitive.Segment>
{/if}
