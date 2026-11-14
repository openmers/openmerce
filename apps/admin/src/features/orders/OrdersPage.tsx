import {
  Alert,
  createDataTableColumnHelper,
  DataTable,
  DataTablePagination,
  DataTableTable,
  DataTableToolbar,
  Heading,
  useDataTable,
} from "@openmers/ui"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { orpc } from "../../lib/api"
import { toApiError } from "../../lib/apiError"
import { formatDate, formatMoney } from "../../lib/format"
import { useCursorPages } from "../../lib/useCursorPages"

const PAGE_SIZE = 20

type Row = {
  id: string
  number: string
  state: string
  paymentStatus: string
  currency: string
  totalGross: number
  placedAt: number
}

const column = createDataTableColumnHelper<Row>()
const columns = [
  column.accessor("number", { header: "Order" }),
  column.accessor("placedAt", {
    header: "Placed",
    cell: ({ row }) => formatDate(row.original.placedAt),
  }),
  column.accessor("state", { header: "Status" }),
  column.accessor("paymentStatus", { header: "Payment" }),
  column.accessor("totalGross", {
    header: "Total",
    align: "right",
    headerAlign: "right",
    cell: ({ row }) => formatMoney(row.original.totalGross, row.original.currency),
  }),
]

export function OrdersPage() {
  const navigate = useNavigate()
  const pages = useCursorPages(PAGE_SIZE)
  const query = useQuery({
    ...orpc.admin.orders.list.queryOptions({ input: { cursor: pages.cursor, limit: PAGE_SIZE } }),
    placeholderData: keepPreviousData,
  })
  const instance = useDataTable({
    data: query.data?.items ?? [],
    columns,
    getRowId: (row) => row.id,
    isLoading: query.isPending,
    pagination: pages.pagination(query.data?.nextCursor),
    onRowClick: (_event, row) => navigate({ to: "/orders/$orderId", params: { orderId: row.id } }),
  })

  return (
    <DataTable instance={instance} className="rounded-lg bg-card shadow-elevation-card-rest">
      <DataTableToolbar>
        <Heading level="h2">Orders</Heading>
      </DataTableToolbar>
      {query.error ? (
        <Alert variant="error" className="m-6">
          {toApiError(query.error).message}
        </Alert>
      ) : (
        <DataTableTable
          emptyState={{ empty: { heading: "No orders", description: "Orders appear here." } }}
        />
      )}
      <DataTablePagination />
    </DataTable>
  )
}
