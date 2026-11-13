<script lang="ts">
import CircleCheck from "@lucide/svelte/icons/circle-check"
import CircleDashed from "@lucide/svelte/icons/circle-dashed"
import CircleDot from "@lucide/svelte/icons/circle-dot"
import { cn } from "../../utils/cn"
import { type ProgressStatus, progressTabsIndicatorVariants } from "./variants"

type Props = {
  status?: ProgressStatus
  class?: string
}

let { status = "not-started", class: className }: Props = $props()
</script>

<span class={cn(progressTabsIndicatorVariants(), className)} data-status={status}>
  {#if status === "completed"}
    <CircleCheck />
  {:else if status === "in-progress"}
    <CircleDot />
  {:else}
    <CircleDashed />
  {/if}
</span>
