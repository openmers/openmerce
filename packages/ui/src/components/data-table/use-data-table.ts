import type { ColumnFiltersState } from "@tanstack/table-core"
import { constructTable, functionalUpdate } from "@tanstack/table-core"
import { useEffect, useRef, useState } from "react"
import { dataTableFeatures } from "./features"
import type {
  DataTableColumnFilter,
  DataTableDateComparisonOperator,
  DataTableFilterOption,
} from "./filter-types"
import type { DataTableInstance, DataTableOptions } from "./table-types"
import { DataTableEmptyState, type DataTableFilteringState, type DataTableRowData } from "./types"

/**
 * The kit's `useDataTable` counterpart. The table does not fetch, sort or filter data;
 * every feature is controlled from outside through a `state` + `on…Change` pair.
 */
export function useDataTable<TData extends DataTableRowData>(
  options: DataTableOptions<TData>,
): DataTableInstance<TData> {
  const filteringState = options.filtering?.state ?? {}
  const sortingState = options.sorting?.state ?? null
  const selectionState = options.rowSelection?.state ?? {}
  const visibilityState = options.columnVisibility?.state ?? {}
  const orderState = options.columnOrder?.state ?? []

  const table = constructTable({
    features: dataTableFeatures,
    data: options.data,
    columns: options.columns,
    getRowId: options.getRowId,
    enableRowSelection: options.rowSelection?.enableRowSelection ?? false,
    enableHiding: options.columnVisibility !== undefined,
    manualSorting: true,
    manualFiltering: true,
    state: {
      sorting: sortingState ? [sortingState] : [],
      columnFilters: toColumnFilters(filteringState),
      rowSelection: selectionState,
      columnVisibility: visibilityState,
      columnOrder: orderState,
    },
    onSortingChange: (updater) => {
      const next = functionalUpdate(updater, sortingState ? [sortingState] : [])
      options.sorting?.onSortingChange(next[0] ?? null)
    },
    onColumnFiltersChange: (updater) => {
      const next = functionalUpdate(updater, toColumnFilters(filteringState))
      options.filtering?.onFilteringChange(fromColumnFilters(next))
    },
    onRowSelectionChange: (updater) => {
      options.rowSelection?.onRowSelectionChange(functionalUpdate(updater, selectionState))
    },
    onColumnVisibilityChange: (updater) => {
      options.columnVisibility?.onColumnVisibilityChange(functionalUpdate(updater, visibilityState))
    },
    onColumnOrderChange: (updater) => {
      options.columnOrder?.onColumnOrderChange(functionalUpdate(updater, orderState))
    },
  })

  const outerSearch = options.search?.state ?? ""
  const [localSearch, setLocalSearch] = useState(outerSearch)
  const [syncedSearch, setSyncedSearch] = useState(outerSearch)
  if (syncedSearch !== outerSearch) {
    setSyncedSearch(outerSearch)
    setLocalSearch(outerSearch)
  }
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(searchTimer.current), [])

  const pageIndex = options.pagination?.state.pageIndex ?? 0
  const pageSize = options.pagination?.state.pageSize ?? 10

  function resetPage() {
    if (options.pagination && pageIndex !== 0) {
      options.pagination.onPaginationChange({ pageIndex: 0, pageSize })
    }
  }

  function updateFiltering(state: DataTableFilteringState) {
    resetPage()
    options.filtering?.onFilteringChange(state)
  }

  const instance: DataTableInstance<TData> = {
    getHeaderGroups: () => table.getHeaderGroups(),
    getRowModel: () => table.getRowModel(),
    getAllColumns: () => table.getAllColumns(),
    setColumnVisibility: (state) => options.columnVisibility?.onColumnVisibilityChange(state),
    setColumnOrder: (state) => options.columnOrder?.onColumnOrderChange(state),
    setColumnOrderFromArray: (order) => options.columnOrder?.onColumnOrderChange(order),

    get enablePagination() {
      return options.pagination !== undefined
    },
    getCanNextPage: () => {
      if (!options.pagination) return false
      if (options.rowCount !== undefined) {
        return (pageIndex + 1) * pageSize < options.rowCount
      }
      return table.getRowModel().rows.length >= pageSize
    },
    getCanPreviousPage: () => pageIndex > 0,
    nextPage: () => {
      if (!options.pagination) return
      options.pagination.onPaginationChange({ pageIndex: pageIndex + 1, pageSize })
    },
    previousPage: () => {
      if (!options.pagination || pageIndex === 0) return
      options.pagination.onPaginationChange({ pageIndex: pageIndex - 1, pageSize })
    },
    getPageCount: () => {
      if (!options.pagination || options.rowCount === undefined) return null
      return Math.max(1, Math.ceil(options.rowCount / pageSize))
    },
    get pageIndex() {
      return pageIndex
    },
    get pageSize() {
      return pageSize
    },
    get rowCount() {
      return options.rowCount
    },

    get enableSearch() {
      return options.search !== undefined
    },
    getSearch: () => localSearch,
    onSearchChange: (search) => {
      setLocalSearch(search)
      const onChange = options.search?.onSearchChange
      if (!onChange) return
      clearTimeout(searchTimer.current)
      const debounce = options.search?.debounce ?? 300
      if (debounce <= 0) {
        resetPage()
        onChange(search)
        return
      }
      searchTimer.current = setTimeout(() => {
        resetPage()
        onChange(search)
      }, debounce)
    },

    get enableSorting() {
      return options.sorting !== undefined
    },
    getSorting: () => sortingState,
    setSorting: (sortingOrUpdater) => {
      const next =
        typeof sortingOrUpdater === "function" ? sortingOrUpdater(sortingState) : sortingOrUpdater
      resetPage()
      options.sorting?.onSortingChange(next)
    },

    get enableFiltering() {
      return options.filtering !== undefined
    },
    getFilters: () => options.filters ?? [],
    getFilterOptions: <T extends string | string[] | DataTableDateComparisonOperator>(
      id: string,
    ) => {
      const filter = (options.filters ?? []).find((entry) => entry.id === id)
      if (!filter || !("options" in filter)) return null
      return (filter.options as DataTableFilterOption<T>[]) ?? null
    },
    getFilterMeta: (id) => (options.filters ?? []).find((filter) => filter.id === id) ?? null,
    getFiltering: () => filteringState,
    addFilter: (filter: DataTableColumnFilter) => {
      updateFiltering({ ...filteringState, [filter.id]: filter.value })
    },
    removeFilter: (id: string) => {
      const next = { ...filteringState }
      delete next[id]
      updateFiltering(next)
    },
    clearFilters: () => updateFiltering({}),
    updateFilter: (filter) => {
      updateFiltering({ ...filteringState, [filter.id]: filter.value })
    },

    getCommands: () => options.commands ?? [],
    getRowSelection: () => selectionState,
    get onRowClick() {
      return options.onRowClick
    },

    get emptyState() {
      const hasRows = table.getRowModel().rows.length > 0
      if (hasRows) return DataTableEmptyState.POPULATED
      const hasSearch = Boolean(options.search?.state)
      const hasFilters = Object.keys(filteringState).length > 0
      return hasSearch || hasFilters
        ? DataTableEmptyState.FILTERED_EMPTY
        : DataTableEmptyState.EMPTY
    },
    get isLoading() {
      return options.isLoading ?? false
    },
    get showSkeleton() {
      return (options.isLoading ?? false) && table.getRowModel().rows.length === 0
    },

    get enableColumnVisibility() {
      return options.columnVisibility !== undefined
    },
    get enableColumnOrder() {
      return options.columnOrder !== undefined
    },
    get columnOrder() {
      return orderState
    },
  }

  return instance
}

function toColumnFilters(state: DataTableFilteringState): ColumnFiltersState {
  return Object.entries(state).map(([id, value]) => ({ id, value }))
}

function fromColumnFilters(filters: ColumnFiltersState): DataTableFilteringState {
  return Object.fromEntries(filters.map((filter) => [filter.id, filter.value]))
}

/** Alias kept for the earlier factory name. */
export const createDataTable = useDataTable
