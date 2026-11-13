<script lang="ts">
import type { Snippet } from "svelte"

let { title, children }: { title: string; children: Snippet } = $props()
</script>

<section class="flex flex-col gap-3 border-b border-border py-6">
  <h2 class="txt-compact-small-plus text-muted-foreground uppercase">{title}</h2>
  <div class="flex flex-wrap items-start gap-3">{@render children()}</div>
</section>
