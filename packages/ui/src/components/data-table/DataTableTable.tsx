import { useEffect, useRef, useState } from "react"
import { cn } from "../../utils/cn"
import { Skeleton } from "../skeleton/Skeleton"
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from "../table/Table"
import { useDataTableContext } from "./context"
import { DataTableEmptyStateDisplay } from "./DataTable"
import { DataTableActionCell } from "./DataTableActionCell"
import {
  DataTableSelectCell,
  DataTableSelectHeader,
  DataTableSortingIcon,
  DataTableTruncatedCell,
} from "./DataTableCells"
import { getCellContent, getHeaderContent } from "./render-content"
import type {
  DataTableColumnMeta,
  DataTableEmptyStateProps,
  DataTableHeaderGroup,
  DataTableRow as DataTableRowType,
} from "./types"

const SELECT_WIDTH =
  "w-[calc(20px+24px+24px)] min-w-[calc(20px+24px+24px)] max-w-[calc(20px+24px+24px)]"
const ACTION_WIDTH =
  "w-[calc(28px+24px+4px)] min-w-[calc(28px+24px+4px)] max-w-[calc(28px+24px+4px)]"
const STICKY_EDGE =
  "after:absolute after:inset-y-0 after:right-0 after:h-full after:w-px after:bg-transparent after:content-['']"

export function DataTableTable({ emptyState }: { emptyState?: DataTableEmptyStateProps }) {
  const instance = useDataTableContext()
  const columns = instance.getAllColumns()
  const hasSelect = columns.some((column) => column.id === "select")
  const hasActions = columns.some((column) => column.id === "action")
  const [showStickyBorder, setShowStickyBorder] = useState(false)
  const scrollable = useRef<HTMLDivElement>(null)
  const pageIndex = instance.pageIndex

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll back to the top on every page change
  useEffect(() => {
    if (!scrollable.current) return
    scrollable.current.scrollTop = 0
    scrollable.current.scrollLeft = 0
  }, [pageIndex])

  return (
    <div className="flex w-full flex-1 flex-col overflow-hidden">
      {instance.showSkeleton ? (
        <div className="min-h-0 w-full flex-1 overscroll-auto border-y">
          <div className="flex flex-col [&>*+*]:border-t">
            <Skeleton className="h-12 w-full" />
            {Array.from({ length: instance.pageSize }, (_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows have no identity
              <Skeleton key={index} className="h-12 w-full rounded-none" />
            ))}
          </div>
        </div>
      ) : instance.emptyState === "POPULATED" ? (
        <div
          ref={scrollable}
          onScroll={(event) => setShowStickyBorder(event.currentTarget.scrollLeft > 0)}
          className="min-h-0 w-full flex-1 overflow-auto overscroll-auto border-y"
        >
          <Table className="relative isolate w-full">
            <TableHeader className="sticky inset-x-0 top-0 z-[1] w-full border-b-0 border-t-0 shadow-[0_1px_1px_0] shadow-border transform-gpu">
              {instance.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className={cn("border-b-0", {
                    "[&_th:last-of-type]:w-[1%] [&_th:last-of-type]:whitespace-nowrap": hasActions,
                    "[&_th:first-of-type]:w-[1%] [&_th:first-of-type]:whitespace-nowrap": hasSelect,
                  })}
                >
                  {headerGroup.headers.map((header, index) => (
                    <DataTableHeaderCell
                      key={header.id}
                      header={header}
                      index={index}
                      hasSelect={hasSelect}
                      showStickyBorder={showStickyBorder}
                    />
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="border-b-0 border-t-0">
              {instance.getRowModel().rows.map((row) => (
                <DataTableBodyRow
                  key={row.id}
                  row={row}
                  hasSelect={hasSelect}
                  showStickyBorder={showStickyBorder}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
      <DataTableEmptyStateDisplay state={instance.emptyState} props={emptyState} />
    </div>
  )
}

/** Column sizes are optional kit extras; table-core types them only with the sizing feature. */
function sizeStyle(def: object) {
  const { size, maxSize, minSize } = def as { size?: number; maxSize?: number; minSize?: number }
  return { width: size, maxWidth: maxSize, minWidth: minSize }
}

type CellLayout = { index: number; hasSelect: boolean; showStickyBorder: boolean }

function stickyClasses(id: string, { index, hasSelect, showStickyBorder }: CellLayout) {
  const isSelect = id === "select"
  const isFirstColumn = hasSelect ? index === 1 : index === 0
  return {
    [SELECT_WIDTH]: isSelect,
    [ACTION_WIDTH]: id === "action",
    [STICKY_EDGE]: isFirstColumn,
    "after:bg-border": showStickyBorder && isFirstColumn,
    "left-0": isSelect || (isFirstColumn && !hasSelect),
    "left-[calc(20px+24px+24px)]": isFirstColumn && hasSelect,
    sticky: isFirstColumn || isSelect,
  }
}

export function DataTableHeaderCell({
  header,
  ...layout
}: CellLayout & { header: DataTableHeaderGroup["headers"][number] }) {
  const column = header.column
  const canSort = column.getCanSort()
  const meta = column.columnDef.meta as DataTableColumnMeta | undefined
  const alignMeta = meta?.___alignMetaData
  const headerAlign = alignMeta?.align ?? alignMeta?.headerAlign ?? "left"
  const isRight = headerAlign === "right"
  const isCenter = headerAlign === "center"
  const isSpecial = header.id === "action" || header.id === "select"
  const isFirstColumn = layout.hasSelect ? layout.index === 1 : layout.index === 0
  const Tag = canSort ? "button" : "div"
  const icon = canSort && (
    <DataTableSortingIcon
      direction={column.getIsSorted()}
      firstDirection={column.getFirstSortDir()}
    />
  )

  return (
    <TableHeaderCell
      className={cn("whitespace-nowrap", stickyClasses(header.id, layout), {
        "bg-background": isFirstColumn || header.id === "select",
      })}
      style={isSpecial ? undefined : sizeStyle(column.columnDef)}
    >
      <Tag
        type={canSort ? "button" : undefined}
        onClick={canSort ? column.getToggleSortingHandler() : undefined}
        onMouseDown={canSort ? (event) => event.stopPropagation() : undefined}
        className={cn("group flex cursor-default items-center gap-2", {
          "cursor-pointer": canSort,
          "w-full": isRight || isCenter,
          "w-fit": !isRight && !isCenter,
          "justify-end": isRight,
          "justify-center": isCenter,
        })}
      >
        {isRight && icon}
        {header.id === "select" && meta?.___customSelectHeader !== true ? (
          <DataTableSelectHeader ctx={header.getContext() as never} />
        ) : (
          getHeaderContent(header.getContext() as never)
        )}
        {!isRight && icon}
      </Tag>
    </TableHeaderCell>
  )
}

export function DataTableBodyRow({
  row,
  hasSelect,
  showStickyBorder,
}: {
  row: DataTableRowType
  hasSelect: boolean
  showStickyBorder: boolean
}) {
  const instance = useDataTableContext()
  return (
    <TableRow
      onClick={(event) => instance.onRowClick?.(event.nativeEvent, row.original)}
      className={cn("group/row last-of-type:border-b-0", {
        "cursor-pointer": !!instance.onRowClick,
      })}
    >
      {row.getVisibleCells().map((cell, index) => {
        const id = cell.column.id
        const isSelect = id === "select"
        const isAction = id === "action"
        const isFirstColumn = hasSelect ? index === 1 : index === 0
        const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined
        const align = meta?.___alignMetaData?.align
        const truncate = meta?.___truncateTooltip !== false
        const body =
          isSelect && meta?.___customSelectCell !== true ? (
            <DataTableSelectCell row={row} />
          ) : isAction ? (
            <DataTableActionCell ctx={cell.getContext() as never} />
          ) : (
            <DataTableTruncatedCell
              content={getCellContent(cell.getContext() as never)}
              truncateTooltip={truncate}
            />
          )
        return (
          <TableCell
            key={cell.id}
            // Menus and checkboxes portal their events through the row; keep them from clicking it.
            onClick={isSelect || isAction ? (event) => event.stopPropagation() : undefined}
            className={cn(
              "items-stretch whitespace-nowrap",
              stickyClasses(id, { index, hasSelect, showStickyBorder }),
              { "bg-card transition-fg group-hover/row:bg-accent": isFirstColumn || isSelect },
            )}
            style={isSelect || isAction ? undefined : sizeStyle(cell.column.columnDef)}
          >
            {align === "right" || align === "center" ? (
              <div
                className={cn("flex min-w-0 items-center", {
                  "justify-end": align === "right",
                  "justify-center": align === "center",
                })}
              >
                {body}
              </div>
            ) : (
              body
            )}
          </TableCell>
        )
      })}
    </TableRow>
  )
}
