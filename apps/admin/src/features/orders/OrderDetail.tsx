import {
  Alert,
  Badge,
  Container,
  Heading,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
} from "@openmers/ui"
import { useQuery } from "@tanstack/react-query"
import { orpc } from "../../lib/api"
import { toApiError } from "../../lib/apiError"
import { formatDate, formatMoney } from "../../lib/format"

/** Read-only order view; actions (capture, refund, cancel) come with the editing slice. */
export function OrderDetail({ id }: { id: string }) {
  const query = useQuery(orpc.admin.orders.get.queryOptions({ input: { id } }))
  if (query.error) return <Alert variant="error">{toApiError(query.error).message}</Alert>
  if (!query.data) return <Skeleton className="h-48 w-full" />

  const { order } = query.data
  const money = (minor: number) => formatMoney(minor, order.currency)
  const totals: [string, number][] = [
    ["Subtotal", order.subtotalNet],
    ["Discount", -order.discountTotal],
    ["Shipping", order.shippingTotal],
    ["Tax", order.taxTotal],
    ["Total", order.totalGross],
  ]

  return (
    <div className="flex flex-col gap-4">
      <Container className="flex flex-wrap items-center gap-3">
        <Heading level="h1">Order {order.number}</Heading>
        <Badge size="2xsmall">{order.state}</Badge>
        <Badge size="2xsmall">{order.paymentStatus}</Badge>
        <Badge size="2xsmall">{order.fulfillmentStatus}</Badge>
        <Text size="small" className="text-muted-foreground">
          {formatDate(order.placedAt)}
        </Text>
      </Container>
      <Container className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Item</TableHeaderCell>
              <TableHeaderCell>SKU</TableHeaderCell>
              <TableHeaderCell className="text-right">Qty</TableHeaderCell>
              <TableHeaderCell className="text-right">Unit price</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.name}</TableCell>
                <TableCell>{line.sku ?? "-"}</TableCell>
                <TableCell className="text-right">{line.quantity}</TableCell>
                <TableCell className="text-right">{money(line.unitPriceGross)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Container>
      <Container className="flex flex-col gap-1">
        <Heading level="h3">Summary</Heading>
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1">
          {totals.map(([label, amount]) => (
            <div key={label} className="contents">
              <dt>
                <Text size="small">{label}</Text>
              </dt>
              <dd className="text-right">
                <Text size="small" weight={label === "Total" ? "plus" : "regular"}>
                  {money(amount)}
                </Text>
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </div>
  )
}
