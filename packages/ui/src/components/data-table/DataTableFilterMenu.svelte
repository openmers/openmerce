<script lang="ts">
import Funnel from "@lucide/svelte/icons/funnel"
import DropdownMenu from "../dropdown-menu/DropdownMenu.svelte"
import DropdownMenuContent from "../dropdown-menu/DropdownMenuContent.svelte"
import DropdownMenuItem from "../dropdown-menu/DropdownMenuItem.svelte"
import DropdownMenuTrigger from "../dropdown-menu/DropdownMenuTrigger.svelte"
import IconButton from "../icon-button/IconButton.svelte"
import Skeleton from "../skeleton/Skeleton.svelte"
import { getDataTableContext } from "./context"
import type { DataTableFilterType } from "./filter-types"

type Props = {
  tooltip?: string
  onAddFilter?: (id: string, value: unknown) => void
}

let { tooltip, onAddFilter }: Props = $props()

const instance = getDataTableContext()
const enabledFilters = $derived(Object.keys(instance.getFiltering()))
const filterOptions = $derived(
  instance.getFilters().filter((filter) => !enabledFilters.includes(filter.id)),
)

function getDefaultValue(type: DataTableFilterType) {
  switch (type) {
    case "select":
    case "multiselect":
      return []
    case "string":
      return ""
    default:
      return null
  }
}
</script>

{#if enabledFilters.length > 0 || filterOptions.length > 0}
  {#if instance.showSkeleton}
    <Skeleton class="size-7" />
  {:else}
    <DropdownMenu>
      <DropdownMenuTrigger>
        {#snippet child({ props })}
          <IconButton
            {...props}
            size="small"
            disabled={filterOptions.length === 0}
            title={tooltip}
            aria-label={tooltip ?? "Filters"}
          >
            <Funnel aria-hidden="true" />
          </IconButton>
        {/snippet}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" class="overflow-y-auto">
        {#each filterOptions as filter (filter.id)}
          <DropdownMenuItem
            onSelect={() => {
              const value = getDefaultValue(filter.type)
              if (onAddFilter) {
                onAddFilter(filter.id, value)
                return
              }
              instance.addFilter({ id: filter.id, value })
            }}
          >
            {filter.label}
          </DropdownMenuItem>
        {/each}
      </DropdownMenuContent>
    </DropdownMenu>
  {/if}
{/if}
