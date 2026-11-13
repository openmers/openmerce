<script lang="ts">
import Columns3 from "@lucide/svelte/icons/columns-3"
import { cn } from "../../utils/cn"
import Checkbox from "../checkbox/Checkbox.svelte"
import DropdownMenu from "../dropdown-menu/DropdownMenu.svelte"
import DropdownMenuContent from "../dropdown-menu/DropdownMenuContent.svelte"
import DropdownMenuItem from "../dropdown-menu/DropdownMenuItem.svelte"
import DropdownMenuLabel from "../dropdown-menu/DropdownMenuLabel.svelte"
import DropdownMenuSeparator from "../dropdown-menu/DropdownMenuSeparator.svelte"
import DropdownMenuTrigger from "../dropdown-menu/DropdownMenuTrigger.svelte"
import IconButton from "../icon-button/IconButton.svelte"
import Skeleton from "../skeleton/Skeleton.svelte"
import { getDataTableContext } from "./context"

type Props = {
  class?: string
  tooltip?: string
}

let { class: className, tooltip }: Props = $props()

const instance = getDataTableContext()
const columns = $derived(instance.getAllColumns().filter((column) => column.getCanHide()))
const allVisible = $derived(columns.every((column) => column.getIsVisible()))
const someVisible = $derived(columns.some((column) => column.getIsVisible()))

function toggleAll(value: boolean) {
  instance.setColumnVisibility(Object.fromEntries(columns.map((column) => [column.id, value])))
}
</script>

{#if instance.enableColumnVisibility}
  {#if instance.showSkeleton}
    <Skeleton class="size-7" />
  {:else}
    <DropdownMenu>
      <DropdownMenuTrigger>
        {#snippet child({ props })}
          <IconButton {...props} size="small" class={className} title={tooltip} aria-label={tooltip ?? "Columns"}>
            <Columns3 aria-hidden="true" />
          </IconButton>
        {/snippet}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="max-h-[400px] min-w-[200px] overflow-hidden">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(event) => { event.preventDefault(); toggleAll(!allVisible) }}>
          <div class="flex items-center gap-x-2">
            <Checkbox
              checked={allVisible}
              indeterminate={someVisible && !allVisible}
              class="pointer-events-none"
            />
            <span>Toggle all</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div class="max-h-[250px] overflow-y-auto">
          {#each columns as column (column.id)}
            <DropdownMenuItem
              onSelect={(event) => { event.preventDefault(); column.toggleVisibility() }}
            >
              <div class="flex items-center gap-x-2">
                <Checkbox checked={column.getIsVisible()} class="pointer-events-none" />
                <span class="truncate">
                  {(column.columnDef.meta as { name?: string } | undefined)?.name ?? column.id}
                </span>
              </div>
            </DropdownMenuItem>
          {/each}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  {/if}
{/if}
