<script lang="ts" generics="TData extends DataTableRowData">
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { setDataTableContext } from "./context"
import type { DataTableInstance } from "./table-types"
import type { DataTableRowData } from "./types"

type Props = {
  instance: DataTableInstance<TData>
  class?: string
  children?: Snippet
}

let { instance, class: className, children }: Props = $props()

// Kök bağlamı bileşen ömrü boyunca aynı örnekle bir kez kurulur.
// svelte-ignore state_referenced_locally
setDataTableContext(instance)
</script>

<div class={cn("relative flex min-h-0 flex-1 flex-col", className)}>
  {@render children?.()}
</div>
