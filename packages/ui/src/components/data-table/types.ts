import type {
  CellContext,
  Column,
  ColumnDef,
  ColumnOrderState,
  ColumnSort,
  ColumnVisibilityState,
  HeaderContext,
  HeaderGroup,
  PaginationState,
  Row,
  RowData,
  RowModel,
  RowSelectionState,
  SortDirection,
} from "@tanstack/table-core"
import type { Snippet } from "svelte"
import type { DataTableFeatureSet } from "./features"

export type DataTableRowData = RowData

export type DataTableRow<TData extends DataTableRowData = DataTableRowData> = Row<
  DataTableFeatureSet,
  TData
>

export type DataTableColumn<TData extends DataTableRowData = DataTableRowData> = Column<
  DataTableFeatureSet,
  TData,
  unknown
>

export type DataTableColumnDef<TData extends DataTableRowData, TValue = unknown> = ColumnDef<
  DataTableFeatureSet,
  TData,
  TValue
>

export type DataTableCellContext<TData extends DataTableRowData, TValue = unknown> = CellContext<
  DataTableFeatureSet,
  TData,
  TValue
>

export type DataTableHeaderContext<
  TData extends DataTableRowData,
  TValue = unknown,
> = HeaderContext<DataTableFeatureSet, TData, TValue>

export type DataTableHeaderGroup<TData extends DataTableRowData = DataTableRowData> = HeaderGroup<
  DataTableFeatureSet,
  TData
>

export type DataTableRowModel<TData extends DataTableRowData = DataTableRowData> = RowModel<
  DataTableFeatureSet,
  TData
>

/** Hücre/başlık içeriği: düz metin ya da çağrıldığında render edilen bir snippet. */
export type DataTableRenderedContent = string | number | boolean | Snippet | null | undefined

export type DataTableCellRenderer<TData extends DataTableRowData, TValue = unknown> = (
  ctx: DataTableCellContext<TData, TValue>,
) => DataTableRenderedContent

export type DataTableHeaderRenderer<TData extends DataTableRowData, TValue = unknown> = (
  ctx: DataTableHeaderContext<TData, TValue>,
) => DataTableRenderedContent

export type DataTableAction<TData extends DataTableRowData = DataTableRowData> = {
  label: string
  onClick: (ctx: DataTableCellContext<TData>) => void
  icon?: Snippet
}

export type DataTableActions<TData extends DataTableRowData = DataTableRowData> =
  | DataTableAction<TData>[]
  | DataTableAction<TData>[][]
  | ((ctx: DataTableCellContext<TData>) => DataTableAction<TData>[] | DataTableAction<TData>[][])

export type DataTableSortDirection = SortDirection

export type DataTableSortingState = ColumnSort
export type DataTableRowSelectionState = RowSelectionState
export type DataTablePaginationState = PaginationState
export type DataTableVisibilityState = ColumnVisibilityState
export type DataTableColumnOrderState = ColumnOrderState
export type DataTableFilteringState = Record<string, unknown>

export type DataTableColumnAlignment = "left" | "center" | "right"
export type DataTableHeaderAlignment = DataTableColumnAlignment

export type DataTableSortableColumnDef = {
  sortLabel?: string
  sortAscLabel?: string
  sortDescLabel?: string
  enableSorting?: boolean
}

export type DataTableAlignableColumnDef = {
  headerAlign?: DataTableColumnAlignment
  align?: DataTableColumnAlignment
}

export type DataTableColumnMeta<TData extends DataTableRowData = DataTableRowData> = {
  name?: string
  ___sortMetaData?: DataTableSortableColumnDef
  ___alignMetaData?: DataTableAlignableColumnDef
  ___truncateTooltip?: boolean
  ___actions?: DataTableActions<TData>
  ___customSelectHeader?: boolean
  ___customSelectCell?: boolean
}

export type DataTableDisplayColumnDef<TData extends DataTableRowData> = {
  id?: string
  header?: string | DataTableHeaderRenderer<TData>
  cell?: DataTableCellRenderer<TData>
  meta?: DataTableColumnMeta<TData>
  minSize?: number
  maxSize?: number
  size?: number
}

export interface DataTableActionColumnDef<TData extends DataTableRowData>
  extends Omit<DataTableDisplayColumnDef<TData>, "cell" | "header"> {
  actions: DataTableActions<TData>
}

export interface DataTableSelectColumnDef<TData extends DataTableRowData>
  extends Pick<DataTableDisplayColumnDef<TData>, "cell" | "header"> {}

export interface DataTableColumnHelper<TData extends DataTableRowData> {
  accessor: (
    accessor: keyof TData & string,
    column?: DataTableDisplayColumnDef<TData> &
      DataTableSortableColumnDef &
      DataTableAlignableColumnDef & { truncateTooltip?: boolean },
  ) => DataTableColumnDef<TData>
  display: (column: DataTableDisplayColumnDef<TData>) => DataTableColumnDef<TData>
  action: (props: DataTableActionColumnDef<TData>) => DataTableColumnDef<TData>
  select: (props?: DataTableSelectColumnDef<TData>) => DataTableColumnDef<TData>
}

export const DataTableEmptyState = {
  EMPTY: "EMPTY",
  FILTERED_EMPTY: "FILTERED_EMPTY",
  POPULATED: "POPULATED",
} as const

export type DataTableEmptyState = (typeof DataTableEmptyState)[keyof typeof DataTableEmptyState]

export interface DataTableCommand {
  label: string
  action: (selection: DataTableRowSelectionState) => void | Promise<void>
  shortcut: string
}

export type DataTableEmptyStateContent = {
  heading?: string
  description?: string
  custom?: Snippet
}

export type DataTableEmptyStateProps = {
  filtered?: DataTableEmptyStateContent
  empty?: DataTableEmptyStateContent
}
