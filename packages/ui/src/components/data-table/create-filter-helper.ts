import type { DataTableFilter, DataTableFilterProps } from "./filter-types"

/** Süzgeç tanımlarını sütun anahtarına bağlar; `custom` serbest tanım bırakır. */
export function createDataTableFilterHelper<TData>() {
  return {
    accessor: (accessor: keyof TData & string, props: DataTableFilterProps): DataTableFilter =>
      ({ id: accessor, ...props }) as DataTableFilter,
    custom: <T extends DataTableFilterProps>(props: T): DataTableFilter<T> =>
      props as DataTableFilter<T>,
  }
}
