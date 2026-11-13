import { addLine, parseAddress, removeLine, updateCart, updateLine } from "@openmers/core"
import { ORPCError } from "@orpc/server"
import { base } from "../../orpc/base"
import { rethrowCommerce } from "../../orpc/commerceErrors"
import { rethrowCustomer } from "../account/requireCustomer"
import { currentCart, type LoadedCart, loadCart } from "./current"
import { cartView } from "./view"

type Context = Parameters<typeof currentCart>[0]

/** Runs a write against the caller's cart, then returns the recalculated view. */
async function mutate(
  context: Context,
  write: (cart: LoadedCart) => Promise<unknown>,
  create = false,
) {
  const cart = await currentCart(context, { create })
  if (!cart) throw new ORPCError("NOT_FOUND", { message: "no cart" })
  await write(cart).catch(rethrowCommerce)
  return cartView(await loadCart(context, cart.data.cart.publicId), context.ctx.channel.id)
}

const get = base.shop.cart.get.handler(async ({ context }) =>
  cartView(await currentCart(context), context.ctx.channel.id),
)

const addLineRoute = base.shop.cart.addLine.handler(({ input, context }) =>
  mutate(
    context,
    (cart) =>
      addLine(context.ctx, {
        cartPublicId: cart.data.cart.publicId,
        variantPublicId: input.variant,
        quantity: input.quantity,
        personalization: input.personalization,
        version: input.version,
      }),
    true,
  ),
)

const updateLineRoute = base.shop.cart.updateLine.handler(({ input, context }) =>
  mutate(context, (cart) =>
    updateLine(context.ctx, {
      cartPublicId: cart.data.cart.publicId,
      variantPublicId: input.variant,
      lineKey: input.lineKey,
      quantity: input.quantity,
      version: input.version,
    }),
  ),
)

const removeLineRoute = base.shop.cart.removeLine.handler(({ input, context }) =>
  mutate(context, (cart) =>
    removeLine(context.ctx, {
      cartPublicId: cart.data.cart.publicId,
      variantPublicId: input.variant,
      lineKey: input.lineKey,
      version: input.version,
    }),
  ),
)

/** Only a code of a live channel promotion is accepted; stored upper-case, once. */
const applyCoupon = base.shop.cart.applyCoupon.handler(({ input, context }) =>
  mutate(context, async (cart) => {
    const code = input.code.toUpperCase()
    const known = cart.config.promotions
      .get(context.ctx.channel.id)
      ?.some((p) => p.couponCode?.toUpperCase() === code)
    if (!known) throw new ORPCError("INVALID_INPUT", { message: "unknown coupon" })
    const codes = cart.data.cart.couponCodes.filter((c) => c.toUpperCase() !== code)
    return updateCart(context.ctx, {
      cartPublicId: cart.data.cart.publicId,
      version: input.version ?? cart.data.cart.version,
      patch: { couponCodes: [...codes, code] },
    })
  }),
)

const removeCoupon = base.shop.cart.removeCoupon.handler(({ input, context }) =>
  mutate(context, (cart) =>
    updateCart(context.ctx, {
      cartPublicId: cart.data.cart.publicId,
      version: input.version ?? cart.data.cart.version,
      patch: {
        couponCodes: cart.data.cart.couponCodes.filter(
          (c) => c.toUpperCase() !== input.code.toUpperCase(),
        ),
      },
    }),
  ),
)

/** Method must be linked to the channel; zone eligibility is decided by `calculate`. */
const setShippingMethod = base.shop.cart.setShippingMethod.handler(({ input, context }) =>
  mutate(context, async (cart) => {
    const method =
      input.method === null
        ? null
        : cart.config.shippingMethods.find(
            (m) => m.publicId === input.method && m.channelIds.includes(context.ctx.channel.id),
          )
    if (method === undefined) throw new ORPCError("INVALID_INPUT", { message: "unknown method" })
    return updateCart(context.ctx, {
      cartPublicId: cart.data.cart.publicId,
      version: input.version ?? cart.data.cart.version,
      patch: { shippingMethodId: method?.id ?? null },
    })
  }),
)

/** Addresses are checked with the country rules of the customer address book. */
const setAddress = base.shop.cart.setAddress.handler(({ input, context }) =>
  mutate(context, async (cart) => {
    let shipping: Record<string, unknown>
    let billing: Record<string, unknown> | null
    try {
      shipping = parseAddress(input.shipping)
      billing = input.billing ? parseAddress(input.billing) : null
    } catch (error) {
      rethrowCustomer(error)
    }
    return updateCart(context.ctx, {
      cartPublicId: cart.data.cart.publicId,
      version: input.version ?? cart.data.cart.version,
      patch: {
        shippingAddress: shipping,
        billingAddress: billing,
        ...(input.email ? { email: input.email } : {}),
      },
    })
  }),
)

/** Shop cart router: same shape as `contract.shop.cart`. */
export const cartRouter = {
  get,
  addLine: addLineRoute,
  updateLine: updateLineRoute,
  removeLine: removeLineRoute,
  applyCoupon,
  removeCoupon,
  setShippingMethod,
  setAddress,
}
