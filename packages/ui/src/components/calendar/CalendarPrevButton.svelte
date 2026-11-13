<script lang="ts">
import ChevronLeft from "@lucide/svelte/icons/chevron-left"
import { Calendar as CalendarPrimitive } from "bits-ui"
import type { HTMLButtonAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import IconButton from "../icon-button/IconButton.svelte"
import { calendarButtonVariants } from "./variants"

type Props = CalendarPrimitive.PrevButtonProps

let { class: className, ...rest }: Props = $props()
</script>

<CalendarPrimitive.PrevButton {...rest}>
  {#snippet child({ props })}
    <IconButton
      {...(props as HTMLButtonAttributes)}
      size="small"
      variant="transparent"
      class={cn(calendarButtonVariants(), className)}
      aria-label="Önceki ay"
    >
      <ChevronLeft />
    </IconButton>
  {/snippet}
</CalendarPrimitive.PrevButton>
