import { CUSTOMER_UPLOADS, confirmUpload } from "@openmers/core"
import { ORPCError } from "@orpc/server"
import { base } from "../../orpc/base"
import { rethrowCommerce } from "../../orpc/commerceErrors"
import { currentCart } from "../cart/current"

/** `shop.uploads.confirm`: only an upload of the caller's own cart; another cart's id is 404. */
export const confirmUploadRoute = base.shop.uploads.confirm.handler(async ({ input, context }) => {
  const loaded = await currentCart(context)
  if (!loaded) throw new ORPCError("NOT_FOUND", { message: "no cart" })
  const r = await confirmUpload(context.ctx, {
    id: input.id,
    policy: CUSTOMER_UPLOADS,
    owner: { kind: "cart", id: loaded.data.cart.id },
  }).catch(rethrowCommerce)
  return {
    id: r.id,
    status: r.status,
    width: r.width,
    height: r.height,
    reason: r.reason ?? null,
  }
})
