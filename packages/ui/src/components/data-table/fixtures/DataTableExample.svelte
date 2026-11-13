<script lang="ts">
import { createDataTableColumnHelper } from "../create-column-helper"
import { createDataTableCommandHelper } from "../create-command-helper"
import { createDataTable } from "../create-data-table.svelte"
import { createDataTableFilterHelper } from "../create-filter-helper"
import DataTable from "../DataTable.svelte"
import DataTableColumnVisibilityMenu from "../DataTableColumnVisibilityMenu.svelte"
import DataTableCommandBar from "../DataTableCommandBar.svelte"
import DataTableFilterMenu from "../DataTableFilterMenu.svelte"
import DataTablePagination from "../DataTablePagination.svelte"
import DataTableSearch from "../DataTableSearch.svelte"
import DataTableSortingMenu from "../DataTableSortingMenu.svelte"
import DataTableTable from "../DataTableTable.svelte"
import DataTableToolbar from "../DataTableToolbar.svelte"

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
  onRowSelectionChange?: (state: Record<string, boolean>) => void
  onSearchChange?: (state: string) => void
  onPaginationChange?: (state: { pageIndex: number; pageSize: number }) => void
  onCommand?: (ids: string[]) => void
}

const defaultData: Product[] = [
  { id: "1", name: "Sneaker", status: "active", featured: true, price: 120 },
  { id: "2", name: "Boot", status: "draft", featured: false, price: 220 },
  { id: "3", name: "Sandal", status: "active", featured: false, price: 80 },
]

let {
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
}: Props = $props()

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
const commands = [
  commandHelper.command({
    label: "Delete",
    shortcut: "d",
    action: (selection) => onCommand?.(Object.keys(selection)),
  }),
]

let sorting = $state<{ id: string; desc: boolean } | null>(null)
let filtering = $state<Record<string, unknown>>({})
let selection = $state<Record<string, boolean>>({})
// The example component takes the initial controlled-state values from props.
// svelte-ignore state_referenced_locally
let search = $state(initialSearch)
// svelte-ignore state_referenced_locally
let pagination = $state({ pageIndex: 0, pageSize })
let visibility = $state<Record<string, boolean>>({})

const instance = createDataTable(() => ({
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
      sorting = next
      onSortingChange?.(next)
    },
  },
  filtering: {
    state: filtering,
    onFilteringChange: (next) => {
      filtering = next
      onFilteringChange?.(next)
    },
  },
  rowSelection: {
    state: selection,
    onRowSelectionChange: (next) => {
      selection = next
      onRowSelectionChange?.(next)
    },
    enableRowSelection: true,
  },
  search: {
    state: search,
    onSearchChange: (next) => {
      search = next
      onSearchChange?.(next)
    },
    debounce: 0,
  },
  pagination: {
    state: pagination,
    onPaginationChange: (next) => {
      pagination = next
      onPaginationChange?.(next)
    },
  },
  columnVisibility: {
    state: visibility,
    onColumnVisibilityChange: (next) => {
      visibility = next
    },
  },
}))
</script>

<DataTable {instance}>
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
