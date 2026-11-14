import { Fragment, type ReactNode } from "react"
import { cn } from "../../utils/cn"
import { Button } from "../button/Button"
import {
  CommandBar,
  CommandBarBar,
  CommandBarCommand,
  CommandBarSeparator,
  CommandBarValue,
} from "../command-bar/CommandBar"
import { Input } from "../input/Input"
import { Skeleton } from "../skeleton/Skeleton"
import { TablePagination } from "../table/TablePagination"
import { Text } from "../text/Text"
import { DataTableContext, useDataTableContext } from "./context"
import { DataTableFilterBar } from "./DataTableFilterBar"
import type { DataTableInstance } from "./table-types"
import type { DataTableEmptyState, DataTableEmptyStateProps, DataTableRowData } from "./types"

export function DataTable<TData extends DataTableRowData>({
  instance,
  className,
  children,
}: {
  instance: DataTableInstance<TData>
  className?: string
  children?: ReactNode
}) {
  return (
    <DataTableContext.Provider value={instance as unknown as DataTableInstance}>
      <div className={cn("relative flex min-h-0 flex-1 flex-col", className)}>{children}</div>
    </DataTableContext.Provider>
  )
}

/** Renders cell/header content; kept for parity with custom renderers that import it. */
export function DataTableContent({ content }: { content: ReactNode }) {
  return <>{content ?? ""}</>
}

export function DataTableToolbar({
  className,
  children,
  translations,
  filterBarContent,
  alwaysShowFilterBar,
}: {
  className?: string
  children?: ReactNode
  translations?: { clearAll?: string; sort?: string; columns?: string }
  filterBarContent?: ReactNode
  alwaysShowFilterBar?: boolean
}) {
  return (
    <div className="flex flex-col [&>*+*]:border-t">
      <div className={cn("flex items-center px-6 py-4", className)}>{children}</div>
      <DataTableFilterBar
        clearAllFiltersLabel={translations?.clearAll}
        alwaysShow={alwaysShowFilterBar}
      >
        {filterBarContent}
      </DataTableFilterBar>
    </div>
  )
}

export function DataTableSearch({
  autoFocus,
  className,
  placeholder,
}: {
  autoFocus?: boolean
  className?: string
  placeholder?: string
}) {
  const instance = useDataTableContext()
  if (!instance.enableSearch) return null
  if (instance.showSkeleton) return <Skeleton className="h-7 w-[128px]" />
  return (
    <Input
      size="small"
      type="search"
      value={instance.getSearch()}
      onChange={(event) => instance.onSearchChange(event.currentTarget.value)}
      className={cn({ "pr-[calc(15px+2px+8px)]": instance.isLoading }, className)}
      autoFocus={autoFocus}
      placeholder={placeholder}
    />
  )
}

export function DataTablePagination({
  translations,
}: {
  translations?: { of?: string; results?: string; pages?: string; prev?: string; next?: string }
}) {
  const instance = useDataTableContext()
  if (!instance.enablePagination) return null
  if (instance.showSkeleton) {
    return (
      <div>
        <div className="flex items-center justify-between p-4">
          <Skeleton className="h-7 w-[138px]" />
          <div className="flex items-center gap-x-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-11" />
            <Skeleton className="h-7 w-11" />
          </div>
        </div>
      </div>
    )
  }
  if (instance.rowCount === undefined) {
    return (
      <div className="txt-compact-small-plus flex w-full items-center justify-end gap-x-2 px-3 py-4 text-muted-foreground">
        <Button
          type="button"
          variant="transparent"
          onClick={instance.previousPage}
          disabled={!instance.getCanPreviousPage()}
        >
          {translations?.prev ?? "Prev"}
        </Button>
        <Button
          type="button"
          variant="transparent"
          onClick={instance.nextPage}
          disabled={!instance.getCanNextPage()}
        >
          {translations?.next ?? "Next"}
        </Button>
      </div>
    )
  }
  return (
    <TablePagination
      className="shrink-0"
      translations={translations}
      canNextPage={instance.getCanNextPage()}
      canPreviousPage={instance.getCanPreviousPage()}
      pageCount={instance.getPageCount() ?? 0}
      count={instance.rowCount}
      nextPage={instance.nextPage}
      previousPage={instance.previousPage}
      pageIndex={instance.pageIndex}
      pageSize={instance.pageSize}
    />
  )
}

export function DataTableCommandBar({
  selectedLabel,
}: {
  selectedLabel?: ((count: number) => string) | string
}) {
  const instance = useDataTableContext()
  const commands = instance.getCommands()
  const rowSelection = instance.getRowSelection()
  const count = Object.keys(rowSelection ?? {}).length
  const open = commands.length > 0 && count > 0
  const label = typeof selectedLabel === "function" ? selectedLabel(count) : selectedLabel
  if (commands.length === 0) return null
  return (
    <CommandBar open={open}>
      <CommandBarBar>
        {selectedLabel && (
          <>
            <CommandBarValue>{label}</CommandBarValue>
            <CommandBarSeparator />
          </>
        )}
        {commands.map((command, index) => (
          <Fragment key={command.label}>
            <CommandBarCommand
              action={() => command.action(rowSelection)}
              label={command.label}
              shortcut={command.shortcut}
              disabled={!open}
            />
            {index < commands.length - 1 && <CommandBarSeparator />}
          </Fragment>
        ))}
      </CommandBarBar>
    </CommandBar>
  )
}

export function DataTableEmptyStateDisplay({
  state,
  props,
}: {
  state: DataTableEmptyState
  props?: DataTableEmptyStateProps
}) {
  if (state === "POPULATED") return null
  const content = state === "EMPTY" ? props?.empty : props?.filtered
  return (
    <div className="flex min-h-[250px] w-full flex-1 flex-col items-center justify-center border-y px-6 py-4">
      {content?.custom ?? (
        <div className="flex size-full flex-col items-center justify-center gap-2">
          <Text size="base" weight="plus">
            {content?.heading}
          </Text>
          <Text>{content?.description}</Text>
        </div>
      )}
    </div>
  )
}
