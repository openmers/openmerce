<script lang="ts">
import type { Snippet } from "svelte"
import type { DataTableRenderedContent } from "./types"

type Props = {
  content: DataTableRenderedContent
}

let { content }: Props = $props()
</script>

{#if typeof content === "function"}
  {@render (content as Snippet)()}
{:else}
  {content ?? ""}
{/if}
