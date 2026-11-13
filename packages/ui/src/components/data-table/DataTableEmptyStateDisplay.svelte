<script lang="ts">
import Text from "../text/Text.svelte"
import type { DataTableEmptyState, DataTableEmptyStateProps } from "./types"

type Props = {
  state: DataTableEmptyState
  props?: DataTableEmptyStateProps
}

let { state, props }: Props = $props()

const content = $derived(state === "EMPTY" ? props?.empty : props?.filtered)
</script>

{#if state !== "POPULATED"}
  <div
    class="flex min-h-[250px] w-full flex-1 flex-col items-center justify-center border-y px-6 py-4"
  >
    {#if content?.custom}
      {@render content.custom()}
    {:else}
      <div class="flex size-full flex-col items-center justify-center gap-2">
        <Text size="base" weight="plus">{content?.heading}</Text>
        <Text>{content?.description}</Text>
      </div>
    {/if}
  </div>
{/if}
