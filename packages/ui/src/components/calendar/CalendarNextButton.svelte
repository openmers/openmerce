<script lang="ts">
import ChevronRight from "@lucide/svelte/icons/chevron-right"
import { Calendar as CalendarPrimitive } from "bits-ui"
import type { HTMLButtonAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import IconButton from "../icon-button/IconButton.svelte"
import { calendarButtonVariants } from "./variants"

type Props = CalendarPrimitive.NextButtonProps

let { class: className, ...rest }: Props = $props()
</script>

<CalendarPrimitive.NextButton {...rest}>
  {#snippet child({ props })}
    <IconButton
      {...(props as HTMLButtonAttributes)}
      size="small"
      variant="transparent"
      class={cn(calendarButtonVariants(), className)}
      aria-label="Sonraki ay"
    >
      <ChevronRight />
    </IconButton>
  {/snippet}
</CalendarPrimitive.NextButton>
