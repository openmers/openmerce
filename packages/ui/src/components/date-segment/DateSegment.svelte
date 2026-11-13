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
  /** DateField ve TimeField ayrı context kullanır; segment bileşeni buna göre seçilir. */
  field?: "date" | "time"
  class?: string
}

let { part, value, field = "date", class: className }: Props = $props()

// bits-ui `isPlaceholder` yayınlamaz; boş alanlar biçim harfleriyle ("mm", "dd"...) gösterilir.
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
