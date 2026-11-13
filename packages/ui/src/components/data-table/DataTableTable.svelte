<script lang="ts">
import { cn } from "../../utils/cn"
import Skeleton from "../skeleton/Skeleton.svelte"
import Table from "../table/Table.svelte"
import TableBody from "../table/TableBody.svelte"
import TableHeader from "../table/TableHeader.svelte"
import TableRow from "../table/TableRow.svelte"
import { getDataTableContext } from "./context"
import DataTableBodyRow from "./DataTableBodyRow.svelte"
import DataTableEmptyStateDisplay from "./DataTableEmptyStateDisplay.svelte"
import DataTableHeaderCell from "./DataTableHeaderCell.svelte"
import type { DataTableEmptyStateProps } from "./types"

type Props = {
  emptyState?: DataTableEmptyStateProps
}

let { emptyState }: Props = $props()

const instance = getDataTableContext()
const columns = $derived(instance.getAllColumns())
const hasSelect = $derived(columns.some((column) => column.id === "select"))
const hasActions = $derived(columns.some((column) => column.id === "action"))
const headerGroups = $derived(instance.getHeaderGroups())
const rows = $derived(instance.getRowModel().rows)
const emptyStateValue = $derived(instance.emptyState)
let showStickyBorder = $state(false)
let scrollable = $state<HTMLDivElement | null>(null)

$effect(() => {
  instance.pageIndex
  if (scrollable) {
    scrollable.scrollTop = 0
    scrollable.scrollLeft = 0
  }
})
</script>

<div class="flex w-full flex-1 flex-col overflow-hidden">
  {#if instance.showSkeleton}
    <div class="min-h-0 w-full flex-1 overscroll-auto border-y">
      <div class="flex flex-col [&>*+*]:border-t">
        <Skeleton class="h-12 w-full" />
        {#each Array.from({ length: instance.pageSize }) as _, index (index)}
          <Skeleton class="h-12 w-full rounded-none" />
        {/each}
      </div>
    </div>
  {:else if emptyStateValue === "POPULATED"}
    <div
      bind:this={scrollable}
      onscroll={(event) => (showStickyBorder = event.currentTarget.scrollLeft > 0)}
      class="min-h-0 w-full flex-1 overflow-auto overscroll-auto border-y"
    >
      <Table class="relative isolate w-full">
        <TableHeader
          class="sticky inset-x-0 top-0 z-[1] w-full border-b-0 border-t-0 shadow-[0_1px_1px_0] shadow-border"
          style="transform: translate3d(0,0,0)"
        >
          {#each headerGroups as headerGroup (headerGroup.id)}
            <TableRow
              class={cn("border-b-0", {
                "[&_th:last-of-type]:w-[1%] [&_th:last-of-type]:whitespace-nowrap": hasActions,
                "[&_th:first-of-type]:w-[1%] [&_th:first-of-type]:whitespace-nowrap": hasSelect,
              })}
            >
              {#each headerGroup.headers as header, index (header.id)}
                <DataTableHeaderCell {header} {index} {hasSelect} {showStickyBorder} />
              {/each}
            </TableRow>
          {/each}
        </TableHeader>
        <TableBody class="border-b-0 border-t-0">
          {#each rows as row (row.id)}
            <DataTableBodyRow {row} {hasSelect} {showStickyBorder} />
          {/each}
        </TableBody>
      </Table>
    </div>
  {/if}
  <DataTableEmptyStateDisplay state={emptyStateValue} props={emptyState} />
</div>
