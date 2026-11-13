<script lang="ts">
import ArrowDown from "@lucide/svelte/icons/arrow-down"
import ArrowUp from "@lucide/svelte/icons/arrow-up"
import { cn } from "../../utils/cn"
import type { DataTableSortDirection } from "./types"

type Props = {
  direction: DataTableSortDirection | false
  firstDirection?: DataTableSortDirection
}

let { direction, firstDirection }: Props = $props()

const isSorted = $derived(direction === "asc" || direction === "desc")
const effectiveDirection = $derived(isSorted ? direction : (firstDirection ?? "asc"))
</script>

{#if effectiveDirection === "desc"}
  <ArrowDown
    class={cn("text-fg-muted opacity-0 transition-opacity group-hover:opacity-100", {
      "text-muted-foreground opacity-100": isSorted,
    })}
    aria-hidden="true"
  />
{:else}
  <ArrowUp
    class={cn("text-fg-muted opacity-0 transition-opacity group-hover:opacity-100", {
      "text-muted-foreground opacity-100": isSorted,
    })}
    aria-hidden="true"
  />
{/if}
