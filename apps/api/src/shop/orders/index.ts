import { getGuestOrder, getOrder, listOrders } from "@openmers/core"
import { ORPCError } from "@orpc/server"
import { base } from "../../orpc/base"
import { rethrowCommerce } from "../../orpc/commerceErrors"
import { requireCustomer } from "../account/requireCustomer"
import { orderSummary, orderView } from "./view"

/** Own orders only: the customer filter is part of the query (another customer's order is 404). */
const list = base.shop.orders.list.handler(async ({ input, context }) => {
  const customer = requireCustomer(context)
  const page = await listOrders(context.platform, {
    channelId: context.ctx.channel.id,
    customerId: customer.id,
    ...input,
  }).catch(rethrowCommerce)
  return { items: page.items.map(orderSummary), nextCursor: page.nextCursor }
})

const get = base.shop.orders.get.handler(async ({ input, context }) => {
  const customer = requireCustomer(context)
  const order = await getOrder(context.platform, {
    orderPublicId: input.id,
    channelId: context.ctx.channel.id,
    customerId: customer.id,
  })
  if (!order) throw new ORPCError("NOT_FOUND")
  return { order: orderView(order) }
})

/** Guest access with the revocable `otk_…` token; `ord_…` alone is never enough. */
const guest = base.shop.orders.guest.handler(async ({ input, context }) => {
  const order = await getGuestOrder(context.platform, {
    token: input.token,
    channelId: context.ctx.channel.id,
  })
  if (!order) throw new ORPCError("NOT_FOUND")
  return { order: orderView(order) }
})

/** Shop orders router: same shape as `contract.shop.orders`. */
export const ordersRouter = { list, get, guest }
