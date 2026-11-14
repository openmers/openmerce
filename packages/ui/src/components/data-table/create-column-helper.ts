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
 * Builds column definitions with the kit's meta contract. `enableSorting`
 * is off by default; a column turns it on explicitly for server-side sorting.
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

      // The kit column shape is looser than the table-core generics; the casts keep it assignable.
      return helper.accessor(
        accessor as never,
        {
          ...rest,
          enableSorting: enableSorting ?? false,
          meta: {
            ___sortMetaData: { sortLabel, sortAscLabel, sortDescLabel },
            ___alignMetaData: { headerAlign, align },
            ___truncateTooltip: truncateTooltip,
            ...(meta ?? {}),
          },
        } as never,
      ) as DataTableColumnDef<TData>
    },
    display: (column) => helper.display(column as never) as DataTableColumnDef<TData>,
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
          ...((props as { meta?: object } | undefined)?.meta ?? {}),
          ___customSelectHeader: props?.header !== undefined,
          ___customSelectCell: props?.cell !== undefined,
        },
      }) as DataTableColumnDef<TData>,
  }
}
