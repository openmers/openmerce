import type {
  DataTableColumnFilter,
  DataTableDateComparisonOperator,
  DataTableFilter,
  DataTableFilterOption,
} from "./filter-types"
import type {
  DataTableColumn,
  DataTableColumnDef,
  DataTableColumnOrderState,
  DataTableCommand,
  DataTableEmptyState,
  DataTableFilteringState,
  DataTableHeaderGroup,
  DataTablePaginationState,
  DataTableRowData,
  DataTableRowModel,
  DataTableRowSelectionState,
  DataTableSortingState,
  DataTableVisibilityState,
} from "./types"

export interface DataTableOptions<TData extends DataTableRowData> {
  data: TData[]
  columns: DataTableColumnDef<TData>[]
  filters?: DataTableFilter[]
  commands?: DataTableCommand[]
  isLoading?: boolean
  getRowId?: (row: TData, index: number) => string
  filtering?: {
    state: DataTableFilteringState
    onFilteringChange: (state: DataTableFilteringState) => void
  }
  rowSelection?: {
    state: DataTableRowSelectionState
    onRowSelectionChange: (state: DataTableRowSelectionState) => void
    enableRowSelection?: boolean
  }
  sorting?: {
    state: DataTableSortingState | null
    onSortingChange: (state: DataTableSortingState | null) => void
  }
  search?: {
    state: string
    onSearchChange: (state: string) => void
    debounce?: number
  }
  pagination?: {
    state: DataTablePaginationState
    onPaginationChange: (state: DataTablePaginationState) => void
  }
  onRowClick?: (event: MouseEvent, row: TData) => void
  /** İmleç tabanlı sayfalamada verilmez; o zaman yalnız önceki/sonraki gösterilir. */
  rowCount?: number
  columnVisibility?: {
    state: DataTableVisibilityState
    onColumnVisibilityChange: (state: DataTableVisibilityState) => void
  }
  columnOrder?: {
    state: DataTableColumnOrderState
    onColumnOrderChange: (state: DataTableColumnOrderState) => void
  }
}

export interface DataTableInstance<TData extends DataTableRowData = DataTableRowData> {
  getHeaderGroups: () => DataTableHeaderGroup<TData>[]
  getRowModel: () => DataTableRowModel<TData>
  getAllColumns: () => DataTableColumn<TData>[]
  setColumnVisibility: (state: DataTableVisibilityState) => void
  setColumnOrder: (state: DataTableColumnOrderState) => void
  setColumnOrderFromArray: (order: string[]) => void
  // Pagination
  enablePagination: boolean
  getCanNextPage: () => boolean
  getCanPreviousPage: () => boolean
  nextPage: () => void
  previousPage: () => void
  getPageCount: () => number | null
  pageIndex: number
  pageSize: number
  rowCount?: number
  // Search
  enableSearch: boolean
  getSearch: () => string
  onSearchChange: (search: string) => void
  // Sorting
  enableSorting: boolean
  getSorting: () => DataTableSortingState | null
  setSorting: (
    sortingOrUpdater:
      | DataTableSortingState
      | ((prev: DataTableSortingState | null) => DataTableSortingState),
  ) => void
  // Filtering
  enableFiltering: boolean
  getFilters: () => DataTableFilter[]
  getFilterOptions: <T extends string | string[] | DataTableDateComparisonOperator>(
    id: string,
  ) => DataTableFilterOption<T>[] | null
  getFilterMeta: (id: string) => DataTableFilter | null
  getFiltering: () => DataTableFilteringState
  addFilter: (filter: DataTableColumnFilter) => void
  removeFilter: (id: string) => void
  clearFilters: () => void
  updateFilter: (filter: DataTableColumnFilter) => void
  // Commands
  getCommands: () => DataTableCommand[]
  getRowSelection: () => DataTableRowSelectionState
  onRowClick?: (event: MouseEvent, row: TData) => void
  // Empty state
  emptyState: DataTableEmptyState
  isLoading: boolean
  showSkeleton: boolean
  // Column visibility & order
  enableColumnVisibility: boolean
  enableColumnOrder: boolean
  columnOrder: DataTableColumnOrderState
}
