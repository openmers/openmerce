<script lang="ts">
import type { Snippet } from "svelte"
import Button from "../button/Button.svelte"
import Skeleton from "../skeleton/Skeleton.svelte"
import { getDataTableContext } from "./context"
import DataTableFilter from "./DataTableFilter.svelte"
import { isEmptyFilterValue } from "./filter-utils"

type Props = {
  clearAllFiltersLabel?: string
  alwaysShow?: boolean
  children?: Snippet
}

let { clearAllFiltersLabel = "Clear all", alwaysShow = false, children }: Props = $props()

const instance = getDataTableContext()
const filtering = $derived(instance.getFiltering())
const entries = $derived(
  Object.entries(filtering).map(([id, value]) => ({
    id,
    value,
    isNew: isEmptyFilterValue(value),
  })),
)

function updateFilter(id: string, value: unknown) {
  if (isEmptyFilterValue(value)) {
    instance.removeFilter(id)
    return
  }
  instance.updateFilter({ id, value })
}
</script>

{#if entries.length > 0 || alwaysShow || children}
  {#if instance.showSkeleton}
    <div class="flex w-full overflow-x-auto border-t px-6 py-2">
      <div class="flex min-h-[28px] flex-nowrap items-center gap-2 md:flex-wrap">
        {#each Array.from({ length: entries.length }) as _, index (index)}
          <Skeleton class="h-7 w-[180px]" />
        {/each}
        {#if entries.length > 0}<Skeleton class="h-7 w-[66px]" />{/if}
      </div>
    </div>
  {:else}
    <div
      class="flex w-full flex-nowrap items-center justify-between gap-2 overflow-x-auto border-t px-6 py-2"
    >
      <div class="flex min-h-[28px] flex-nowrap items-center gap-2 md:flex-wrap">
        {#each entries as entry (entry.id)}
          <DataTableFilter
            id={entry.id}
            filter={entry.value}
            isNew={entry.isNew}
            onUpdate={(value) => updateFilter(entry.id, value)}
            onRemove={() => instance.removeFilter(entry.id)}
          />
        {/each}
        {#if entries.length > 0}
          <Button
            variant="transparent"
            size="small"
            type="button"
            class="shrink-0 whitespace-nowrap text-fg-muted hover:text-muted-foreground"
            onclick={instance.clearFilters}
          >
            {clearAllFiltersLabel}
          </Button>
        {/if}
      </div>
      {#if children}
        <div class="flex shrink-0 items-center gap-2">
          {@render children()}
        </div>
      {/if}
    </div>
  {/if}
{/if}
