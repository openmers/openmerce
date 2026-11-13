import {
  applyNormalized,
  getReservation,
  issueGuestToken,
  type ReservationView,
} from "@openmers/core"
import { ORPCError } from "@orpc/server"
import { CART_COOKIE, readCookie } from "../../auth/cartToken"
import { base } from "../../orpc/base"
import { rethrowCommerce } from "../../orpc/commerceErrors"

const FAILED = new Set(["released", "expired", "failed"])

/**
 * `shop.checkout.return` (06 §3): the payment return page asks the provider (`fetchStatus`) and
 * takes the same settle path as the webhook, so racing it yields one order. Only the reservation's
 * own customer (with a session) or own cart (signed cookie, guests only) may read it; anything
 * else is 404.
 */
export const checkoutReturn = base.shop.checkout.return.handler(async ({ input, context }) => {
  const raw = readCookie(context.reqHeaders, CART_COOKIE)
  const cookieCart = raw ? await context.cartSigner.verify(raw) : null
  const owns = (r: ReservationView) =>
    context.customer !== undefined
      ? r.customerId === context.customer.id
      : cookieCart !== null && r.cartPublicId === cookieCart
  let rsv = await getReservation(context.platform, input.reservation)
  if (!rsv || !owns(rsv)) throw new ORPCError("NOT_FOUND")

  const config = await context.commerce.get(context.now)
  const method = config.payments.all().find((m) => m.id === rsv?.paymentMethodId)
  if (!rsv.order && method?.handler.fetchStatus) {
    let truth: Awaited<ReturnType<NonNullable<typeof method.handler.fetchStatus>>> | null = null
    try {
      truth = await method.handler.fetchStatus(
        { now: context.now },
        input.reference ?? rsv.publicId,
        method.args,
      )
    } catch {
      // provider has nothing yet: the page shows pending, the webhook or reconcile settles later
    }
    if (truth && truth.kind !== "refundSync" && truth.reservationPublicId === rsv.publicId) {
      await applyNormalized(context.ctx, method, {
        ...truth,
        eventId: `return:${rsv.publicId}`,
      }).catch(rethrowCommerce)
      rsv = (await getReservation(context.platform, input.reservation)) ?? rsv
    }
  }
  const order = rsv.order ? { id: rsv.order.publicId, number: rsv.order.number } : null
  return {
    status: order
      ? ("placed" as const)
      : FAILED.has(rsv.status)
        ? ("failed" as const)
        : ("pending" as const),
    order,
    guestToken: order && !context.customer ? await issueGuestToken(context.ctx, order.id) : null,
  }
})
