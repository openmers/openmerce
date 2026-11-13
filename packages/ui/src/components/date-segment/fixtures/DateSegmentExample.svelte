<script lang="ts">
import { CalendarDate } from "@internationalized/date"
import { DateField } from "bits-ui"
import DateSegment from "../DateSegment.svelte"

let { value = $bindable<CalendarDate | undefined>(new CalendarDate(2026, 11, 12)), empty = false } =
  $props<{ value?: CalendarDate | undefined; empty?: boolean }>()
</script>

<DateField.Root type="single" value={empty ? undefined : value} aria-label="Tarih">
  <DateField.Input>
    {#snippet children({ segments })}
      {#each segments as segment, index (index)}
        <DateSegment part={segment.part} value={segment.value} />
      {/each}
    {/snippet}
  </DateField.Input>
</DateField.Root>
