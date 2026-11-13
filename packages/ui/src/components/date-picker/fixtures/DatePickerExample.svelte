<script lang="ts">
import { CalendarDate } from "@internationalized/date"
import DatePicker from "../DatePicker.svelte"

let {
  value = $bindable<CalendarDate | undefined>(new CalendarDate(2026, 11, 12)),
  onValueChange,
  size = "base",
} = $props<{
  value?: CalendarDate | undefined
  onValueChange?: (value: unknown) => void
  size?: "base" | "small"
}>()
</script>

<DatePicker bind:value {onValueChange} {size} />
