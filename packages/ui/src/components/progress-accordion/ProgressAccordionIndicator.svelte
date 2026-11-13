<script lang="ts">
import CircleCheck from "@lucide/svelte/icons/circle-check"
import CircleDashed from "@lucide/svelte/icons/circle-dashed"
import CircleDot from "@lucide/svelte/icons/circle-dot"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import type { ProgressStatus } from "../progress-tabs/variants"
import { progressAccordionIndicatorVariants } from "./variants"

type Props = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  status: ProgressStatus
}

let { status, class: className, ...rest }: Props = $props()
</script>

<span
  class={cn(progressAccordionIndicatorVariants(), className)}
  data-status={status}
  {...rest}
>
  {#if status === "completed"}
    <CircleCheck />
  {:else if status === "in-progress"}
    <CircleDot />
  {:else}
    <CircleDashed />
  {/if}
</span>
