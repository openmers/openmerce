import { createColumnHelper as createTanstackColumnHelper } from "@tanstack/table-core"
import type { DataTableFeatureSet } from "./features"
import type {
  DataTableAlignableColumnDef,
  DataTableColumnDef,
  DataTableColumnHelper,
  DataTableRowData,
  DataTableSortableColumnDef,
} from "./types"

/**
 * Sütun tanımlarını Medusa'daki meta sözleşmesiyle üretir. `enableSorting`
 * varsayılan olarak kapalıdır; sunucu taraflı sıralamada sütun açıkça açar.
 */
export function createDataTableColumnHelper<
  TData extends DataTableRowData,
>(): DataTableColumnHelper<TData> {
  const helper = createTanstackColumnHelper<DataTableFeatureSet, TData>()

  return {
    accessor: (accessor, column = {}) => {
      const {
        sortLabel,
        sortAscLabel,
        sortDescLabel,
        headerAlign,
        align,
        truncateTooltip,
        meta,
        enableSorting,
        ...rest
      } = column as typeof column & DataTableSortableColumnDef & DataTableAlignableColumnDef

      return helper.accessor(accessor, {
        ...rest,
        enableSorting: enableSorting ?? false,
        meta: {
          ___sortMetaData: { sortLabel, sortAscLabel, sortDescLabel },
          ___alignMetaData: { headerAlign, align },
          ___truncateTooltip: truncateTooltip,
          ...(meta ?? {}),
        },
      }) as DataTableColumnDef<TData>
    },
    display: (column) => helper.display(column) as DataTableColumnDef<TData>,
    action: ({ actions, ...props }) =>
      helper.display({
        id: "action",
        header: "",
        meta: { ...(props.meta ?? {}), ___actions: actions },
        ...props,
      }) as DataTableColumnDef<TData>,
    select: (props) =>
      helper.display({
        id: "select",
        ...props,
        meta: {
          ...(props?.meta ?? {}),
          ___customSelectHeader: props?.header !== undefined,
          ___customSelectCell: props?.cell !== undefined,
        },
      }) as DataTableColumnDef<TData>,
  }
}
