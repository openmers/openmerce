<script lang="ts">
import { CalendarDate } from "@internationalized/date"
import Calendar from "../Calendar.svelte"

let { value = $bindable(new CalendarDate(2026, 11, 12)), onValueChange } = $props<{
  value?: CalendarDate
  onValueChange?: (value: unknown) => void
}>()
</script>

<Calendar bind:value {onValueChange} locale="tr" aria-label="Tarih" />
