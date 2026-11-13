<script lang="ts">
import Ellipsis from "@lucide/svelte/icons/ellipsis"
import DropdownMenu from "../dropdown-menu/DropdownMenu.svelte"
import DropdownMenuContent from "../dropdown-menu/DropdownMenuContent.svelte"
import DropdownMenuItem from "../dropdown-menu/DropdownMenuItem.svelte"
import DropdownMenuSeparator from "../dropdown-menu/DropdownMenuSeparator.svelte"
import DropdownMenuTrigger from "../dropdown-menu/DropdownMenuTrigger.svelte"
import IconButton from "../icon-button/IconButton.svelte"
import type { DataTableCellContext, DataTableColumnMeta, DataTableRowData } from "./types"

let { ctx }: Props = $props()

const meta = $derived(ctx.column.columnDef.meta as DataTableColumnMeta | undefined)
const hasActions = $derived(Boolean(meta?.___actions))
const resolved = $derived.by(() => {
  const source = meta?.___actions
  if (!source) return []
  if (typeof source === "function") return source(ctx)
  return source
})
</script>

{#if hasActions}
  <DropdownMenu>
    <DropdownMenuTrigger>
      {#snippet child({ props })}
        <IconButton {...props} size="small" variant="transparent" class="ml-1">
          <Ellipsis aria-hidden="true" />
        </IconButton>
      {/snippet}
    </DropdownMenuTrigger>
    <DropdownMenuContent side="bottom">
      {#each resolved as actionOrGroup, index (index)}
        {#if Array.isArray(actionOrGroup)}
          {#each actionOrGroup as action (action.label)}
            <DropdownMenuItem
              class="flex items-center gap-2 [&>svg]:text-muted-foreground"
              onSelect={(event) => {
                event.stopPropagation()
                action.onClick(ctx)
              }}
            >
              {#if action.icon}{@render action.icon()}{/if}
              {action.label}
            </DropdownMenuItem>
          {/each}
          {#if index < resolved.length - 1}
            <DropdownMenuSeparator />
          {/if}
        {:else}
          <DropdownMenuItem
            class="flex items-center gap-2 [&>svg]:text-muted-foreground"
            onSelect={(event) => {
              event.stopPropagation()
              actionOrGroup.onClick(ctx)
            }}
          >
            {#if actionOrGroup.icon}{@render actionOrGroup.icon()}{/if}
            {actionOrGroup.label}
          </DropdownMenuItem>
        {/if}
      {/each}
    </DropdownMenuContent>
  </DropdownMenu>
{/if}
