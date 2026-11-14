import { ArrowDown, ArrowDownUp, ArrowUp, Columns3, Funnel } from "lucide-react"
import { Checkbox } from "../checkbox/Checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu/DropdownMenu"
import { IconButton } from "../icon-button/IconButton"
import { Skeleton } from "../skeleton/Skeleton"
import { useDataTableContext } from "./context"
import type { DataTableFilterType } from "./filter-types"
import { getSortDescriptor, getSortLabel } from "./render-content"

export function DataTableColumnVisibilityMenu({
  className,
  tooltip,
}: {
  className?: string
  tooltip?: string
}) {
  const instance = useDataTableContext()
  if (!instance.enableColumnVisibility) return null
  if (instance.showSkeleton) return <Skeleton className="size-7" />
  const columns = instance.getAllColumns().filter((column) => column.getCanHide())
  const allVisible = columns.every((column) => column.getIsVisible())
  const someVisible = columns.some((column) => column.getIsVisible())
  const toggleAll = (value: boolean) =>
    instance.setColumnVisibility(Object.fromEntries(columns.map((column) => [column.id, value])))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          size="small"
          className={className}
          title={tooltip}
          aria-label={tooltip ?? "Columns"}
        >
          <Columns3 aria-hidden="true" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[400px] min-w-[200px] overflow-hidden">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            toggleAll(!allVisible)
          }}
        >
          <div className="flex items-center gap-x-2">
            <Checkbox
              checked={allVisible}
              indeterminate={someVisible && !allVisible}
              className="pointer-events-none"
            />
            <span>Toggle all</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="max-h-[250px] overflow-y-auto">
          {columns.map((column) => (
            <DropdownMenuItem
              key={column.id}
              onSelect={(event) => {
                event.preventDefault()
                column.toggleVisibility()
              }}
            >
              <div className="flex items-center gap-x-2">
                <Checkbox checked={column.getIsVisible()} className="pointer-events-none" />
                <span className="truncate">
                  {(column.columnDef.meta as { name?: string } | undefined)?.name ?? column.id}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function DataTableSortingMenu({ tooltip }: { tooltip?: string }) {
  const instance = useDataTableContext()
  const sortableColumns = instance.getAllColumns().filter((column) => column.getCanSort())
  if (!instance.enableSorting || sortableColumns.length === 0) return null
  if (instance.showSkeleton) return <Skeleton className="size-7" />
  const sorting = instance.getSorting()
  const selectedColumn = sortableColumns.find((column) => column.id === sorting?.id)
  const keepOpen = (event: Event) => event.preventDefault()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton size="small" title={tooltip} aria-label={tooltip ?? "Sort"}>
          <ArrowDownUp aria-hidden="true" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" className="overflow-y-auto">
        <DropdownMenuRadioGroup
          value={sorting?.id ?? ""}
          onValueChange={(key) =>
            instance.setSorting((prev) => ({ id: key, desc: prev?.desc ?? false }))
          }
        >
          {sortableColumns.map((column) => (
            <DropdownMenuRadioItem key={column.id} value={column.id} onSelect={keepOpen}>
              {getSortLabel(column)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {sorting && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={sorting.desc ? "true" : "false"}
              onValueChange={(desc) =>
                instance.setSorting((prev) => ({ id: prev?.id ?? "", desc: desc === "true" }))
              }
            >
              <DropdownMenuRadioItem
                value="false"
                className="flex items-center gap-2"
                onSelect={keepOpen}
              >
                <ArrowUp className="text-muted-foreground" aria-hidden="true" />
                {getSortDescriptor("asc", selectedColumn)}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="true"
                className="flex items-center gap-2"
                onSelect={keepOpen}
              >
                <ArrowDown className="text-muted-foreground" aria-hidden="true" />
                {getSortDescriptor("desc", selectedColumn)}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

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

export function DataTableFilterMenu({
  tooltip,
  onAddFilter,
}: {
  tooltip?: string
  onAddFilter?: (id: string, value: unknown) => void
}) {
  const instance = useDataTableContext()
  const enabledFilters = Object.keys(instance.getFiltering())
  const filterOptions = instance
    .getFilters()
    .filter((filter) => !enabledFilters.includes(filter.id))
  if (enabledFilters.length === 0 && filterOptions.length === 0) return null
  if (instance.showSkeleton) return <Skeleton className="size-7" />

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          size="small"
          disabled={filterOptions.length === 0}
          title={tooltip}
          aria-label={tooltip ?? "Filters"}
        >
          <Funnel aria-hidden="true" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" className="overflow-y-auto">
        {filterOptions.map((filter) => (
          <DropdownMenuItem
            key={filter.id}
            onSelect={() => {
              const value = getDefaultValue(filter.type)
              if (onAddFilter) onAddFilter(filter.id, value)
              else instance.addFilter({ id: filter.id, value })
            }}
          >
            {filter.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
