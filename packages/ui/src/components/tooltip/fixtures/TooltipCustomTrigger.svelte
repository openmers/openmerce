<script lang="ts">
import type { Snippet } from "svelte"
import Tooltip from "../Tooltip.svelte"

let { content }: { content: Snippet } = $props()
</script>

<Tooltip {content}>
  {#snippet child({ props })}
    <a href="#hedef" {...props}>Bağlantı</a>
  {/snippet}
</Tooltip>
