<script lang="ts">
import Tooltip from "../tooltip/Tooltip.svelte"
import DataTableContent from "./DataTableContent.svelte"
import type { DataTableRenderedContent } from "./types"

type Props = {
  content: DataTableRenderedContent
  truncateTooltip?: boolean
}

let { content, truncateTooltip = true }: Props = $props()

let element = $state<HTMLDivElement | null>(null)
let overflow = $state(false)
let text = $state("")

function check() {
  if (!element) return
  overflow = element.scrollWidth > element.clientWidth
  text = element.textContent ?? ""
}
</script>

{#if truncateTooltip}
  <Tooltip content={text} disabled={!overflow}>
    {#snippet child({ props })}
      <div {...props} bind:this={element} class="truncate" onmouseenter={check}>
        <DataTableContent {content} />
      </div>
    {/snippet}
  </Tooltip>
{:else}
  <DataTableContent {content} />
{/if}
