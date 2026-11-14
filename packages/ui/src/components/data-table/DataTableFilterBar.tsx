import type { ReactNode } from "react"
import { Button } from "../button/Button"
import { Skeleton } from "../skeleton/Skeleton"
import { useDataTableContext } from "./context"
import { DataTableFilterItem } from "./DataTableFilter"
import { isEmptyFilterValue } from "./filter-utils"

export function DataTableFilterBar({
  clearAllFiltersLabel = "Clear all",
  alwaysShow = false,
  children,
}: {
  clearAllFiltersLabel?: string
  alwaysShow?: boolean
  children?: ReactNode
}) {
  const instance = useDataTableContext()
  const entries = Object.entries(instance.getFiltering()).map(([id, value]) => ({
    id,
    value,
    isNew: isEmptyFilterValue(value),
  }))
  if (entries.length === 0 && !alwaysShow && !children) return null

  if (instance.showSkeleton) {
    return (
      <div className="flex w-full overflow-x-auto border-t px-6 py-2">
        <div className="flex min-h-[28px] flex-nowrap items-center gap-2 md:flex-wrap">
          {entries.map((entry) => (
            <Skeleton key={entry.id} className="h-7 w-[180px]" />
          ))}
          {entries.length > 0 && <Skeleton className="h-7 w-[66px]" />}
        </div>
      </div>
    )
  }

  function updateFilter(id: string, value: unknown) {
    if (isEmptyFilterValue(value)) instance.removeFilter(id)
    else instance.updateFilter({ id, value })
  }

  return (
    <div className="flex w-full flex-nowrap items-center justify-between gap-2 overflow-x-auto border-t px-6 py-2">
      <div className="flex min-h-[28px] flex-nowrap items-center gap-2 md:flex-wrap">
        {entries.map((entry) => (
          <DataTableFilterItem
            key={entry.id}
            id={entry.id}
            filter={entry.value}
            isNew={entry.isNew}
            onUpdate={(value) => updateFilter(entry.id, value)}
            onRemove={() => instance.removeFilter(entry.id)}
          />
        ))}
        {entries.length > 0 && (
          <Button
            variant="transparent"
            size="small"
            type="button"
            className="shrink-0 whitespace-nowrap text-fg-muted hover:text-muted-foreground"
            onClick={instance.clearFilters}
          >
            {clearAllFiltersLabel}
          </Button>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}
