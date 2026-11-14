import { createFileRoute } from "@tanstack/react-router"
import { OrderDetail } from "../../../features/orders/OrderDetail"

export const Route = createFileRoute("/_app/orders/$orderId")({
  component: function OrderRoute() {
    const { orderId } = Route.useParams()
    return <OrderDetail id={orderId} />
  },
})
