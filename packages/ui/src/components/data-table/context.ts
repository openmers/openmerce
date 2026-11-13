import { getContext, setContext } from "svelte"
import type { DataTableInstance } from "./table-types"
import type { DataTableRowData } from "./types"

const DATA_TABLE = Symbol("data-table")

export function setDataTableContext<TData extends DataTableRowData>(
  instance: DataTableInstance<TData>,
) {
  setContext(DATA_TABLE, instance)
}

export function getDataTableContext<
  TData extends DataTableRowData = DataTableRowData,
>(): DataTableInstance<TData> {
  const instance = getContext<DataTableInstance<DataTableRowData> | undefined>(DATA_TABLE)
  if (!instance) {
    throw new Error("DataTable bileşenleri bir DataTable kökü içinde kullanılmalıdır")
  }
  return instance as DataTableInstance<TData>
}
