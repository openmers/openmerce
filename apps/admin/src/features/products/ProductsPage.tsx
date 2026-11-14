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
import { orpc } from "../../lib/api"
import { toApiError } from "../../lib/apiError"
import { formatDate } from "../../lib/format"
import { useCursorPages } from "../../lib/useCursorPages"

export const PRODUCTS_PAGE_SIZE = 20

type Row = { publicId: string; name: string; slug: string; updatedAt: number }

const column = createDataTableColumnHelper<Row>()
const columns = [
  column.accessor("name", { header: "Name" }),
  column.accessor("slug", { header: "Slug" }),
  column.accessor("updatedAt", {
    header: "Updated",
    cell: ({ row }) => formatDate(row.original.updatedAt),
  }),
]

export function ProductsPage() {
  const pages = useCursorPages(PRODUCTS_PAGE_SIZE)
  const query = useQuery({
    ...orpc.admin.products.list.queryOptions({
      input: { cursor: pages.cursor, limit: PRODUCTS_PAGE_SIZE },
    }),
    placeholderData: keepPreviousData,
  })
  const instance = useDataTable({
    data: query.data?.items ?? [],
    columns,
    getRowId: (row) => row.publicId,
    isLoading: query.isPending,
    pagination: pages.pagination(query.data?.nextCursor),
  })

  return (
    <DataTable instance={instance} className="rounded-lg bg-card shadow-elevation-card-rest">
      <DataTableToolbar>
        <Heading level="h2">Products</Heading>
      </DataTableToolbar>
      {query.error ? (
        <Alert variant="error" className="m-6">
          {toApiError(query.error).message}
        </Alert>
      ) : (
        <DataTableTable
          emptyState={{ empty: { heading: "No products", description: "Products appear here." } }}
        />
      )}
      <DataTablePagination />
    </DataTable>
  )
}
