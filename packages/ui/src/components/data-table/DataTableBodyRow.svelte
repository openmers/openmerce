<script lang="ts">
import { cn } from "../../utils/cn"
import TableCell from "../table/TableCell.svelte"
import TableRow from "../table/TableRow.svelte"
import { getDataTableContext } from "./context"
import DataTableActionCell from "./DataTableActionCell.svelte"
import DataTableSelectCell from "./DataTableSelectCell.svelte"
import DataTableTruncatedCell from "./DataTableTruncatedCell.svelte"
import { getCellContent } from "./render-content"
import type { DataTableColumnMeta, DataTableRow as DataTableRowType } from "./types"

type Props = {
  row: DataTableRowType
  hasSelect: boolean
  showStickyBorder: boolean
}

let { row, hasSelect, showStickyBorder }: Props = $props()

const instance = getDataTableContext()
</script>

<TableRow
  onclick={(event) => instance.onRowClick?.(event, row.original)}
  class={cn("group/row last-of-type:border-b-0", { "cursor-pointer": !!instance.onRowClick })}
>
  {#each row.getVisibleCells() as cell, index (cell.id)}
    {@const isSelectCell = cell.column.id === "select"}
    {@const isActionCell = cell.column.id === "action"}
    {@const isSpecialCell = isSelectCell || isActionCell}
    {@const isFirstColumn = hasSelect ? index === 1 : index === 0}
    {@const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined}
    {@const align = meta?.___alignMetaData?.align}
    {@const content = isActionCell ? null : getCellContent(cell.getContext() as never)}
    {@const customSelectCell = meta?.___customSelectCell === true}
    <TableCell
      class={cn("items-stretch whitespace-nowrap", {
        "w-[calc(20px+24px+24px)] min-w-[calc(20px+24px+24px)] max-w-[calc(20px+24px+24px)]":
          isSelectCell,
        "w-[calc(28px+24px+4px)] min-w-[calc(28px+24px+4px)] max-w-[calc(28px+24px+4px)]":
          isActionCell,
        "sticky bg-card transition-fg group-hover/row:bg-accent": isFirstColumn || isSelectCell,
        "after:absolute after:inset-y-0 after:right-0 after:h-full after:w-px after:bg-transparent after:content-['']":
          isFirstColumn,
        "after:bg-border": showStickyBorder && isFirstColumn,
        "left-0": isSelectCell || (isFirstColumn && !hasSelect),
        "left-[calc(20px+24px+24px)]": isFirstColumn && hasSelect,
      })}
      style={!isSpecialCell
        ? {
            width: cell.column.columnDef.size,
            maxWidth: cell.column.columnDef.maxSize,
            minWidth: cell.column.columnDef.minSize,
          }
        : undefined}
    >
      {#if isSelectCell && !customSelectCell}
        <DataTableSelectCell {row} />
      {:else if isActionCell}
        <DataTableActionCell ctx={cell.getContext() as never} />
      {:else if align === "right" || align === "center"}
        <div
          class={cn("flex min-w-0 items-center", {
            "justify-end": align === "right",
            "justify-center": align === "center",
          })}
        >
          <DataTableTruncatedCell
            {content}
            truncateTooltip={meta?.___truncateTooltip !== false}
          />
        </div>
      {:else}
        <DataTableTruncatedCell {content} truncateTooltip={meta?.___truncateTooltip !== false} />
      {/if}
    </TableCell>
  {/each}
</TableRow>
