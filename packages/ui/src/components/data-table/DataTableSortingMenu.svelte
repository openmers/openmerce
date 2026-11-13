<script lang="ts">
import ArrowDown from "@lucide/svelte/icons/arrow-down"
import ArrowDownUp from "@lucide/svelte/icons/arrow-down-up"
import ArrowUp from "@lucide/svelte/icons/arrow-up"
import DropdownMenu from "../dropdown-menu/DropdownMenu.svelte"
import DropdownMenuContent from "../dropdown-menu/DropdownMenuContent.svelte"
import DropdownMenuRadioGroup from "../dropdown-menu/DropdownMenuRadioGroup.svelte"
import DropdownMenuRadioItem from "../dropdown-menu/DropdownMenuRadioItem.svelte"
import DropdownMenuSeparator from "../dropdown-menu/DropdownMenuSeparator.svelte"
import DropdownMenuTrigger from "../dropdown-menu/DropdownMenuTrigger.svelte"
import IconButton from "../icon-button/IconButton.svelte"
import Skeleton from "../skeleton/Skeleton.svelte"
import { getDataTableContext } from "./context"
import { getSortDescriptor, getSortLabel } from "./render-content"

type Props = {
  tooltip?: string
}

let { tooltip }: Props = $props()

const instance = getDataTableContext()
const sortableColumns = $derived(instance.getAllColumns().filter((column) => column.getCanSort()))
const sorting = $derived(instance.getSorting())
const selectedColumn = $derived(sortableColumns.find((column) => column.id === sorting?.id))

function setKey(key: string) {
  instance.setSorting((prev) => ({ id: key, desc: prev?.desc ?? false }))
}

function setDesc(desc: string) {
  instance.setSorting((prev) => ({ id: prev?.id ?? "", desc: desc === "true" }))
}
</script>

{#if instance.enableSorting && sortableColumns.length > 0}
  {#if instance.showSkeleton}
    <Skeleton class="size-7" />
  {:else}
    <DropdownMenu>
      <DropdownMenuTrigger>
        {#snippet child({ props })}
          <IconButton {...props} size="small" title={tooltip} aria-label={tooltip ?? "Sort"}>
            <ArrowDownUp aria-hidden="true" />
          </IconButton>
        {/snippet}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" class="overflow-y-auto">
        <DropdownMenuRadioGroup value={sorting?.id ?? ""} onValueChange={setKey}>
          {#each sortableColumns as column (column.id)}
            <DropdownMenuRadioItem value={column.id} onSelect={(event) => event.preventDefault()}>
              {getSortLabel(column)}
            </DropdownMenuRadioItem>
          {/each}
        </DropdownMenuRadioGroup>
        {#if sorting}
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={sorting.desc ? "true" : "false"}
            onValueChange={setDesc}
          >
            <DropdownMenuRadioItem
              value="false"
              class="flex items-center gap-2"
              onSelect={(event) => event.preventDefault()}
            >
              <ArrowUp class="text-muted-foreground" aria-hidden="true" />
              {getSortDescriptor("asc", selectedColumn)}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              value="true"
              class="flex items-center gap-2"
              onSelect={(event) => event.preventDefault()}
            >
              <ArrowDown class="text-muted-foreground" aria-hidden="true" />
              {getSortDescriptor("desc", selectedColumn)}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        {/if}
      </DropdownMenuContent>
    </DropdownMenu>
  {/if}
{/if}
