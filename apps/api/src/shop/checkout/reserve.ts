import {
  createReservation,
  issueGuestToken,
  type PaymentMethod,
  settle,
  upsertCheckoutCustomer,
} from "@openmers/core"
import { ORPCError } from "@orpc/server"
import { CART_COOKIE, readCookie } from "../../auth/cartToken"
import { base } from "../../orpc/base"
import { rethrowCommerce } from "../../orpc/commerceErrors"
import {
  type IdempotencyScope,
  requireIdempotencyKey,
  withIdempotency,
} from "../../orpc/idempotency"
import { currentCart } from "../cart/current"

type Context = Parameters<typeof currentCart>[0]
type Input = {
  paymentMethod: string
  email?: string
  firstName?: string
  lastName?: string
  consents?: string[]
  version?: number
}

const HOSTED_HOLD_MS = 35 * 60_000
const MANUAL_HOLD_MS = 72 * 3_600_000

/**
 * Local hold: hosted pages get the provider session + tolerance (only a webhook releases them);
 * manual methods use their `expiresInHours` argument when set (the sweep releases them).
 */
function holdMs(method: PaymentMethod): number {
  if (method.handler.kind !== "manual") return HOSTED_HOLD_MS
  const hours = method.args.expiresInHours
  return typeof hours === "number" && hours > 0 ? hours * 3_600_000 : MANUAL_HOLD_MS
}

/**
 * Key scope: the session customer, otherwise the signed cart cookie (read before the cart is
 * resolved, so a replay still matches after the cart closed).
 */
async function scopeOf(context: Context): Promise<IdempotencyScope> {
  const key = requireIdempotencyKey(context)
  if (context.customer) return { actorType: "customer", actorId: context.customer.id, key }
  const raw = readCookie(context.reqHeaders, CART_COOKIE)
  const cart = raw ? await context.cartSigner.verify(raw) : null
  return { actorType: "anonymous", actorId: 0, key: `${cart ?? "-"}:${key}` }
}

async function place(context: Context, input: Input) {
  const cart = await currentCart(context)
  if (!cart) throw new ORPCError("NOT_FOUND", { message: "no cart" })
  if (input.version !== undefined && input.version !== cart.data.cart.version) {
    throw new ORPCError("CART_CHANGED")
  }
  const { channel } = context.ctx
  const method = cart.config.payments
    .forChannel(channel.id)
    .find((m) => m.code === input.paymentMethod)
  if (!method) throw new ORPCError("INVALID_INPUT", { message: "unknown payment method" })

  let data = cart.data
  if (!context.customer) {
    if (!channel.guestCheckout) throw new ORPCError("UNAUTHENTICATED")
    const email = input.email ?? data.cart.email
    if (!email) throw new ORPCError("INVALID_INPUT", { message: "email required" })
    // finds or creates the guest record; an existing profile is never changed
    const guest = await upsertCheckoutCustomer(context.ctx, {
      email,
      channelId: channel.id,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      locale: context.ctx.lang,
    })
    // snapshot-only binding: the guest cart itself stays without a customer
    data = { ...data, cart: { ...data.cart, customerId: guest.customerId, email } }
  }
  const now = context.now
  const expiresAt = now + holdMs(method)
  const { publicId } = await createReservation(context.ctx, {
    data,
    totals: cart.totals,
    paymentMethodId: method.id,
    expiresAt,
    source: "web",
    consents: Object.fromEntries((input.consents ?? []).map((c) => [c, now])),
  })
  const start = await method.handler.createCheckout(
    { now },
    { publicId, amount: cart.totals.gross, currency: cart.totals.currency },
    method.args,
  )
  const placed = method.handler.settleOnConfirm
    ? await settle(context.ctx, { reservationPublicId: publicId })
    : null
  const next = placed
    ? { kind: "placed" as const }
    : "redirectUrl" in start
      ? { kind: "redirect" as const, url: start.redirectUrl }
      : { kind: "pending" as const, instructions: { ...start.instructions } }
  return {
    reservation: publicId,
    expiresAt,
    next,
    order: placed ? { id: placed.orderPublicId, number: placed.number } : null,
    guestToken:
      placed && !context.customer ? await issueGuestToken(context.ctx, placed.orderPublicId) : null,
  }
}

/** `shop.checkout.reserve`: `Idempotency-Key` required; same key + body → same reservation. */
export const reserve = base.shop.checkout.reserve.handler(async ({ input, context }) =>
  withIdempotency(context, await scopeOf(context), input, () =>
    place(context, input).catch(rethrowCommerce),
  ),
)
