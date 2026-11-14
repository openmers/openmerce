import { createContext, useContext } from "react"
import type { DataTableInstance } from "./table-types"
import type { DataTableRowData } from "./types"

export const DataTableContext = createContext<DataTableInstance<DataTableRowData> | null>(null)

export function useDataTableContext<
  TData extends DataTableRowData = DataTableRowData,
>(): DataTableInstance<TData> {
  const instance = useContext(DataTableContext)
  if (!instance) {
    throw new Error("DataTable parts must be rendered inside a DataTable root")
  }
  return instance as unknown as DataTableInstance<TData>
}
