import type { ColumnFiltersState } from "@tanstack/table-core"
import { constructTable, functionalUpdate } from "@tanstack/table-core"
import { dataTableFeatures } from "./features"
import type {
  DataTableColumnFilter,
  DataTableDateComparisonOperator,
  DataTableFilterOption,
} from "./filter-types"
import type { DataTableInstance, DataTableOptions } from "./table-types"
import { DataTableEmptyState, type DataTableFilteringState, type DataTableRowData } from "./types"

/**
 * Medusa `useDataTable` karşılığı. Tablo veri getirmez, sıralamaz, süzmez;
 * her özellik `state` + `on…Change` çiftiyle dışarıdan denetlenir.
 *
 * Denetimli durumun canlı kalması için seçenekleri bir getter ile verin:
 * `createDataTable(() => ({ ... }))`. Düz nesne verilirse ilk değerler dondurulur.
 */
export function createDataTable<TData extends DataTableRowData>(
  optionsOrGetter: DataTableOptions<TData> | (() => DataTableOptions<TData>),
): DataTableInstance<TData> {
  const getOptions = typeof optionsOrGetter === "function" ? optionsOrGetter : () => optionsOrGetter

  const filteringState = $derived(getOptions().filtering?.state ?? {})
  const sortingState = $derived(getOptions().sorting?.state ?? null)
  const selectionState = $derived(getOptions().rowSelection?.state ?? {})
  const visibilityState = $derived(getOptions().columnVisibility?.state ?? {})
  const orderState = $derived(getOptions().columnOrder?.state ?? [])

  const table = $derived.by(() => {
    const options = getOptions()
    return constructTable({
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
        columnFilters: Object.entries(filteringState).map(([id, value]) => ({ id, value })),
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
        options.columnVisibility?.onColumnVisibilityChange(
          functionalUpdate(updater, visibilityState),
        )
      },
      onColumnOrderChange: (updater) => {
        options.columnOrder?.onColumnOrderChange(functionalUpdate(updater, orderState))
      },
    })
  })

  let localSearch = $state(getOptions().search?.state ?? "")
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  $effect(() => {
    localSearch = getOptions().search?.state ?? ""
  })

  $effect(() => {
    return () => {
      if (searchTimer) clearTimeout(searchTimer)
    }
  })

  const pageIndex = $derived(getOptions().pagination?.state.pageIndex ?? 0)
  const pageSize = $derived(getOptions().pagination?.state.pageSize ?? 10)

  function resetPage() {
    const options = getOptions()
    if (options.pagination && pageIndex !== 0) {
      options.pagination.onPaginationChange({ pageIndex: 0, pageSize })
    }
  }

  function updateFiltering(state: DataTableFilteringState) {
    resetPage()
    getOptions().filtering?.onFilteringChange(state)
  }

  const instance: DataTableInstance<TData> = {
    getHeaderGroups: () => table.getHeaderGroups(),
    getRowModel: () => table.getRowModel(),
    getAllColumns: () => table.getAllColumns(),
    setColumnVisibility: (state) => getOptions().columnVisibility?.onColumnVisibilityChange(state),
    setColumnOrder: (state) => getOptions().columnOrder?.onColumnOrderChange(state),
    setColumnOrderFromArray: (order) => getOptions().columnOrder?.onColumnOrderChange(order),

    get enablePagination() {
      return getOptions().pagination !== undefined
    },
    getCanNextPage: () => {
      const options = getOptions()
      if (!options.pagination) return false
      if (options.rowCount !== undefined) {
        return (pageIndex + 1) * pageSize < options.rowCount
      }
      return table.getRowModel().rows.length >= pageSize
    },
    getCanPreviousPage: () => pageIndex > 0,
    nextPage: () => {
      const options = getOptions()
      if (!options.pagination) return
      options.pagination.onPaginationChange({ pageIndex: pageIndex + 1, pageSize })
    },
    previousPage: () => {
      const options = getOptions()
      if (!options.pagination || pageIndex === 0) return
      options.pagination.onPaginationChange({ pageIndex: pageIndex - 1, pageSize })
    },
    getPageCount: () => {
      const options = getOptions()
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
      return getOptions().rowCount
    },

    get enableSearch() {
      return getOptions().search !== undefined
    },
    getSearch: () => localSearch,
    onSearchChange: (search) => {
      localSearch = search
      const onChange = getOptions().search?.onSearchChange
      if (!onChange) return
      if (searchTimer) clearTimeout(searchTimer)
      const debounce = getOptions().search?.debounce ?? 300
      if (debounce <= 0) {
        resetPage()
        onChange(search)
        return
      }
      searchTimer = setTimeout(() => {
        resetPage()
        onChange(search)
      }, debounce)
    },

    get enableSorting() {
      return getOptions().sorting !== undefined
    },
    getSorting: () => sortingState,
    setSorting: (sortingOrUpdater) => {
      const next =
        typeof sortingOrUpdater === "function" ? sortingOrUpdater(sortingState) : sortingOrUpdater
      resetPage()
      getOptions().sorting?.onSortingChange(next)
    },

    get enableFiltering() {
      return getOptions().filtering !== undefined
    },
    getFilters: () => getOptions().filters ?? [],
    getFilterOptions: <T extends string | string[] | DataTableDateComparisonOperator>(
      id: string,
    ) => {
      const filter = (getOptions().filters ?? []).find((entry) => entry.id === id)
      if (!filter || !("options" in filter)) return null
      return (filter.options as DataTableFilterOption<T>[]) ?? null
    },
    getFilterMeta: (id) => (getOptions().filters ?? []).find((filter) => filter.id === id) ?? null,
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

    getCommands: () => getOptions().commands ?? [],
    getRowSelection: () => selectionState,
    get onRowClick() {
      return getOptions().onRowClick
    },

    get emptyState() {
      const options = getOptions()
      const hasRows = table.getRowModel().rows.length > 0
      if (hasRows) return DataTableEmptyState.POPULATED
      const hasSearch = Boolean(options.search?.state)
      const hasFilters = Object.keys(filteringState).length > 0
      return hasSearch || hasFilters
        ? DataTableEmptyState.FILTERED_EMPTY
        : DataTableEmptyState.EMPTY
    },
    get isLoading() {
      return getOptions().isLoading ?? false
    },
    get showSkeleton() {
      return (getOptions().isLoading ?? false) && table.getRowModel().rows.length === 0
    },

    get enableColumnVisibility() {
      return getOptions().columnVisibility !== undefined
    },
    get enableColumnOrder() {
      return getOptions().columnOrder !== undefined
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
