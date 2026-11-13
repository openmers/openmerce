import {
  adoptCart,
  type CartData,
  type CartTotals,
  calculate,
  createCart,
  findCustomerCart,
  loadCartData,
} from "@openmers/core"
import { CART_COOKIE, cartCookie, readCookie } from "../../auth/cartToken"
import { type CommerceConfig, sessionPriceLists } from "../../commerce/config"
import type { ApiContext } from "../../orpc/base"

export type LoadedCart = { config: CommerceConfig; data: CartData; totals: CartTotals }

type Ctx = Pick<
  ApiContext,
  | "ctx"
  | "customer"
  | "platform"
  | "commerce"
  | "cartSigner"
  | "reqHeaders"
  | "resHeaders"
  | "https"
  | "now"
>

/** A cart this caller may use: active, this channel, and its own (guest cart ↔ no session). */
function usable(context: Ctx, data: CartData): boolean {
  return (
    data.cart.status === "active" &&
    data.cart.channelId === context.ctx.channel.id &&
    data.cart.customerId === (context.customer?.id ?? null)
  )
}

async function setCookie(context: Ctx, publicId: string): Promise<void> {
  const value = await context.cartSigner.sign(publicId)
  context.resHeaders?.append("set-cookie", cartCookie(value, context.https))
}

/** Cart data (two rounds, `loadCartData`) + totals from in-memory configuration. */
export async function loadCart(context: Ctx, cartPublicId: string): Promise<LoadedCart | null> {
  const config = await context.commerce.get(context.now)
  const { channel } = context.ctx
  const promotions = config.promotions.get(channel.id) ?? []
  const data = await loadCartData(context.platform, { cartPublicId, promotions })
  if (!data) return null
  const totals = calculate(data, {
    channel: {
      id: channel.id,
      defaultTaxZoneId: channel.defaultTaxZoneId,
      pricesIncludeTax: channel.pricesIncludeTax,
    },
    promotions,
    shippingMethods: config.shippingMethods,
    tax: config.tax,
    customerGroupIds: context.customer?.groupIds,
    priceLists: sessionPriceLists(config, channel.id, context.customer?.priceListIds ?? []),
    now: context.now,
  })
  return { config, data, totals }
}

/**
 * The caller's cart. Fast path: the signed `om_c` cookie names a usable cart → two rounds. Signed
 * in without a usable cookie cart: the customer's own active cart wins; only when they have none
 * is the guest cart from the cookie adopted (no line merge). `create` makes an empty cart.
 */
export async function currentCart(
  context: Ctx,
  opts: { create?: boolean } = {},
): Promise<LoadedCart | null> {
  const raw = readCookie(context.reqHeaders, CART_COOKIE)
  const fromCookie = raw ? await context.cartSigner.verify(raw) : null
  const cookieCart = fromCookie ? await loadCart(context, fromCookie) : null
  if (cookieCart && usable(context, cookieCart.data)) return cookieCart

  const { customer } = context
  const channelId = context.ctx.channel.id
  let publicId: string | null = null
  if (customer) {
    publicId = await findCustomerCart(context.platform, { customerId: customer.id, channelId })
    if (
      !publicId &&
      cookieCart?.data.cart.customerId === null &&
      cookieCart.data.cart.channelId === channelId &&
      (await adoptCart(context.ctx, {
        cartPublicId: cookieCart.data.cart.publicId,
        customerId: customer.id,
      }))
    ) {
      publicId = cookieCart.data.cart.publicId
    }
  }
  if (!publicId && opts.create) {
    publicId = await createCart(context.ctx, {
      channelId,
      currency: context.ctx.currency,
      customerId: customer?.id ?? null,
    })
  }
  if (!publicId) return null
  if (publicId !== fromCookie) await setCookie(context, publicId)
  return loadCart(context, publicId)
}
