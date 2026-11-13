import type { DataTableFilter, DataTableFilterProps } from "./filter-types"

/** Binds filter definitions to a column key; `custom` leaves a free-form definition. */
export function createDataTableFilterHelper<TData>() {
  return {
    accessor: (accessor: keyof TData & string, props: DataTableFilterProps): DataTableFilter =>
      ({ id: accessor, ...props }) as DataTableFilter,
    custom: <T extends DataTableFilterProps>(props: T): DataTableFilter<T> =>
      props as DataTableFilter<T>,
  }
}
