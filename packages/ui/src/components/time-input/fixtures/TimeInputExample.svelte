<script lang="ts">
import { Time } from "@internationalized/date"
import type { TimeValue } from "bits-ui"
import TimeInput from "../TimeInput.svelte"

let {
  value = $bindable<TimeValue | undefined>(new Time(14, 30)),
  onChange,
  hourCycle = 24,
  locale = "tr",
} = $props<{
  value?: TimeValue | undefined
  onChange?: (value: TimeValue | undefined) => void
  hourCycle?: 12 | 24
  locale?: string
}>()
</script>

<TimeInput bind:value {onChange} {hourCycle} {locale} />
