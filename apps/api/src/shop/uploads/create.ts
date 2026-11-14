import { CUSTOMER_UPLOADS, createUpload } from "@openmers/core"
import { ORPCError } from "@orpc/server"
import { base } from "../../orpc/base"
import { rethrowCommerce } from "../../orpc/commerceErrors"
import { currentCart } from "../cart/current"

/**
 * `shop.uploads.create`: a personalization image slot of the caller's cart (created if missing).
 * Limited per IP by the route group and per cart here (12-medya).
 */
export const createUploadRoute = base.shop.uploads.create.handler(async ({ input, context }) => {
  const loaded = await currentCart(context, { create: true })
  if (!loaded) throw new ORPCError("NOT_FOUND", { message: "no cart" })
  const cart = loaded.data.cart
  const limit = await context.platform.rateLimit(`upload:cart:${cart.publicId}`)
  if (!limit.ok) throw new ORPCError("RATE_LIMITED", { message: "too many uploads" })
  return createUpload(context.ctx, {
    mime: input.mime,
    bytes: input.bytes,
    policy: CUSTOMER_UPLOADS,
    bucket: "private",
    prefix: `personalization/${cart.publicId}`,
    owner: { kind: "cart", id: cart.id },
  }).catch(rethrowCommerce)
})
