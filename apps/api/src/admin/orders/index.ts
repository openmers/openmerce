import { cancelOrder, getOrder, listOrders, transitionOrder } from "@openmers/core"
import { ORPCError } from "@orpc/server"
import { base } from "../../orpc/base"
import { rethrowCommerce } from "../../orpc/commerceErrors"
import { orderSummary, orderView } from "../../shop/orders/view"
import { adminCtx } from "../commerceCtx"

const list = base.admin.orders.list.handler(async ({ input, context }) => {
  const page = await listOrders(context.platform, {
    channelId: context.ctx.channel.id,
    ...input,
  }).catch(rethrowCommerce)
  return { items: page.items.map(orderSummary), nextCursor: page.nextCursor }
})

const get = base.admin.orders.get.handler(async ({ input, context }) => {
  const order = await getOrder(context.platform, {
    orderPublicId: input.id,
    channelId: context.ctx.channel.id,
  })
  if (!order) throw new ORPCError("NOT_FOUND")
  return { order: orderView(order) }
})

const transition = base.admin.orders.transition.handler(async ({ input, context }) => {
  const { ctx } = await adminCtx(context)
  const moved = await transitionOrder(ctx, { orderPublicId: input.id, to: input.to }).catch(
    rethrowCommerce,
  )
  if (!moved) throw new ORPCError("CONFLICT", { message: "order state changed" })
  return { ok: true as const }
})

const cancel = base.admin.orders.cancel.handler(async ({ input, context }) => {
  const { ctx, methodOf } = await adminCtx(context)
  const r = await cancelOrder(ctx, {
    orderPublicId: input.id,
    reason: input.reason,
    methodOf,
  }).catch(rethrowCommerce)
  if (!r.cancelled) throw new ORPCError("CONFLICT", { message: "order state changed" })
  return {
    ok: true as const,
    refunds: r.refunds.map((f) => ({ id: f.refundPublicId, state: f.state })),
  }
})

/** Admin orders router: same shape as `contract.admin.orders`. */
export const ordersRouter = { list, get, transition, cancel }
