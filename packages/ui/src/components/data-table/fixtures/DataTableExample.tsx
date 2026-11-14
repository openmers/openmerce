import { useState } from "react"
import { createDataTableColumnHelper } from "../create-column-helper"
import { createDataTableCommandHelper } from "../create-command-helper"
import { createDataTableFilterHelper } from "../create-filter-helper"
import {
  DataTable,
  DataTableCommandBar,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
} from "../DataTable"
import {
  DataTableColumnVisibilityMenu,
  DataTableFilterMenu,
  DataTableSortingMenu,
} from "../DataTableMenus"
import { DataTableTable } from "../DataTableTable"
import type { DataTableRowSelectionState } from "../types"
import { useDataTable } from "../use-data-table"

export type Product = {
  id: string
  name: string
  status: "active" | "draft"
  featured: boolean
  price: number
}

type Props = {
  data?: Product[]
  rowCount?: number
  initialSearch?: string
  pageSize?: number
  onRowClick?: (event: MouseEvent, row: Product) => void
  onSortingChange?: (state: { id: string; desc: boolean } | null) => void
  onFilteringChange?: (state: Record<string, unknown>) => void
  onRowSelectionChange?: (state: DataTableRowSelectionState) => void
  onSearchChange?: (state: string) => void
  onPaginationChange?: (state: { pageIndex: number; pageSize: number }) => void
  onCommand?: (ids: string[]) => void
}

const defaultData: Product[] = [
  { id: "1", name: "Sneaker", status: "active", featured: true, price: 120 },
  { id: "2", name: "Boot", status: "draft", featured: false, price: 220 },
  { id: "3", name: "Sandal", status: "active", featured: false, price: 80 },
]

const columnHelper = createDataTableColumnHelper<Product>()
const columns = [
  columnHelper.select(),
  columnHelper.accessor("name", { header: "Name", enableSorting: true }),
  columnHelper.accessor("status", { header: "Status", enableSorting: true }),
  columnHelper.accessor("featured", { header: "Featured", truncateTooltip: false }),
  columnHelper.action({
    actions: [{ label: "Edit", onClick: () => undefined }],
  }),
]

const filterHelper = createDataTableFilterHelper<Product>()
const filters = [
  filterHelper.accessor("status", {
    type: "select",
    label: "Status",
    options: [
      { label: "Active", value: "active" },
      { label: "Draft", value: "draft" },
    ],
  }),
  filterHelper.accessor("name", { type: "string", label: "Name" }),
  filterHelper.accessor("featured", { type: "boolean", label: "Featured" }),
  filterHelper.custom({
    id: "created",
    type: "date",
    label: "Created",
    options: [{ label: "Last week", value: { $gte: "2026-01-01T00:00:00.000Z" } }],
  }),
]

const commandHelper = createDataTableCommandHelper()

export function DataTableExample({
  data = defaultData,
  rowCount,
  initialSearch = "",
  pageSize = 2,
  onRowClick,
  onSortingChange,
  onFilteringChange,
  onRowSelectionChange,
  onSearchChange,
  onPaginationChange,
  onCommand,
}: Props) {
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>(null)
  const [filtering, setFiltering] = useState<Record<string, unknown>>({})
  const [selection, setSelection] = useState<DataTableRowSelectionState>({})
  const [search, setSearch] = useState(initialSearch)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize })
  const [visibility, setVisibility] = useState<Record<string, boolean>>({})

  const commands = [
    commandHelper.command({
      label: "Delete",
      shortcut: "d",
      action: (rows) => onCommand?.(Object.keys(rows)),
    }),
  ]

  const instance = useDataTable({
    data,
    columns,
    filters,
    commands,
    getRowId: (row) => row.id,
    rowCount,
    onRowClick,
    sorting: {
      state: sorting,
      onSortingChange: (next) => {
        setSorting(next)
        onSortingChange?.(next)
      },
    },
    filtering: {
      state: filtering,
      onFilteringChange: (next) => {
        setFiltering(next)
        onFilteringChange?.(next)
      },
    },
    rowSelection: {
      state: selection,
      onRowSelectionChange: (next) => {
        setSelection(next)
        onRowSelectionChange?.(next)
      },
      enableRowSelection: true,
    },
    search: {
      state: search,
      onSearchChange: (next) => {
        setSearch(next)
        onSearchChange?.(next)
      },
      debounce: 0,
    },
    pagination: {
      state: pagination,
      onPaginationChange: (next) => {
        setPagination(next)
        onPaginationChange?.(next)
      },
    },
    columnVisibility: {
      state: visibility,
      onColumnVisibilityChange: setVisibility,
    },
  })

  return (
    <DataTable instance={instance}>
      <DataTableToolbar>
        <DataTableSearch placeholder="Search products" />
        <DataTableSortingMenu />
        <DataTableFilterMenu />
        <DataTableColumnVisibilityMenu />
      </DataTableToolbar>
      <DataTableTable
        emptyState={{
          empty: { heading: "No products", description: "Create your first product" },
          filtered: { heading: "No results", description: "Try clearing filters" },
        }}
      />
      <DataTablePagination />
      <DataTableCommandBar selectedLabel={(count) => `${count} selected`} />
    </DataTable>
  )
}
