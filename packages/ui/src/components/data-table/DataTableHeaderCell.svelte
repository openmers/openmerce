<script lang="ts">
import { cn } from "../../utils/cn"
import TableHeaderCell from "../table/TableHeaderCell.svelte"
import DataTableContent from "./DataTableContent.svelte"
import DataTableSelectHeader from "./DataTableSelectHeader.svelte"
import DataTableSortingIcon from "./DataTableSortingIcon.svelte"
import { getHeaderContent } from "./render-content"
import type { DataTableColumnMeta, DataTableHeaderGroup, DataTableRowData } from "./types"

type Props = {
  header: DataTableHeaderGroup[number]["headers"][number]
  index: number
  hasSelect: boolean
  showStickyBorder: boolean
}

let { header, index, hasSelect, showStickyBorder }: Props = $props()

const canSort = $derived(header.column.getCanSort())
const sortDirection = $derived(header.column.getIsSorted())
const firstSortDirection = $derived(header.column.getFirstSortDir())
const sortHandler = $derived(header.column.getToggleSortingHandler())
const isActionHeader = $derived(header.id === "action")
const isSelectHeader = $derived(header.id === "select")
const isSpecialHeader = $derived(isActionHeader || isSelectHeader)
const isFirstColumn = $derived(hasSelect ? index === 1 : index === 0)

const alignMeta = $derived(
  (header.column.columnDef.meta as DataTableColumnMeta | undefined)?.___alignMetaData,
)
const headerAlign = $derived(alignMeta?.align ?? alignMeta?.headerAlign ?? "left")
const isRightAligned = $derived(headerAlign === "right")
const isCenterAligned = $derived(headerAlign === "center")
const content = $derived(getHeaderContent(header.getContext() as never))
const hasCustomHeader = $derived(
  (header.column.columnDef.meta as DataTableColumnMeta | undefined)?.___customSelectHeader === true,
)
</script>

<TableHeaderCell
  class={cn("whitespace-nowrap", {
    "w-[calc(20px+24px+24px)] min-w-[calc(20px+24px+24px)] max-w-[calc(20px+24px+24px)]":
      isSelectHeader,
    "w-[calc(28px+24px+4px)] min-w-[calc(28px+24px+4px)] max-w-[calc(28px+24px+4px)]":
      isActionHeader,
    "after:absolute after:inset-y-0 after:right-0 after:h-full after:w-px after:bg-transparent after:content-['']":
      isFirstColumn,
    "after:bg-border": showStickyBorder && isFirstColumn,
    "sticky bg-background": isFirstColumn || isSelectHeader,
    "left-0": isSelectHeader || (isFirstColumn && !hasSelect),
    "left-[calc(20px+24px+24px)]": isFirstColumn && hasSelect,
  })}
  style={!isSpecialHeader
    ? {
        width: header.column.columnDef.size,
        maxWidth: header.column.columnDef.maxSize,
        minWidth: header.column.columnDef.minSize,
      }
    : undefined}
>
  <svelte:element
    this={canSort ? "button" : "div"}
    type={canSort ? "button" : undefined}
    role={canSort ? "button" : undefined}
    onclick={canSort ? sortHandler : undefined}
    onmousedown={canSort ? (event: MouseEvent) => event.stopPropagation() : undefined}
    class={cn("group flex cursor-default items-center gap-2", {
      "cursor-pointer": canSort,
      "w-full": isRightAligned || isCenterAligned,
      "w-fit": !isRightAligned && !isCenterAligned,
      "justify-end": isRightAligned,
      "justify-center": isCenterAligned,
    })}
  >
    {#if canSort && isRightAligned}
      <DataTableSortingIcon direction={sortDirection} firstDirection={firstSortDirection} />
    {/if}
    {#if isSelectHeader && !hasCustomHeader}
      <DataTableSelectHeader ctx={header.getContext() as never} />
    {:else}
      <DataTableContent {content} />
    {/if}
    {#if canSort && !isRightAligned}
      <DataTableSortingIcon direction={sortDirection} firstDirection={firstSortDirection} />
    {/if}
  </svelte:element>
</TableHeaderCell>
