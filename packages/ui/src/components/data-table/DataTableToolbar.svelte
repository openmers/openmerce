<script lang="ts">
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import DataTableFilterBar from "./DataTableFilterBar.svelte"

type Props = {
  class?: string
  children?: Snippet
  translations?: { clearAll?: string; sort?: string; columns?: string }
  filterBarContent?: Snippet
  alwaysShowFilterBar?: boolean
}

let {
  class: className,
  children,
  translations,
  filterBarContent,
  alwaysShowFilterBar,
}: Props = $props()
</script>

<div class="flex flex-col [&>*+*]:border-t">
  <div class={cn("flex items-center px-6 py-4", className)}>
    {@render children?.()}
  </div>
  <DataTableFilterBar clearAllFiltersLabel={translations?.clearAll} alwaysShow={alwaysShowFilterBar}>
    {@render filterBarContent?.()}
  </DataTableFilterBar>
</div>
