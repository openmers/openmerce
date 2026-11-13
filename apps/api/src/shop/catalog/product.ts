import { getProductView } from "@openmers/core"
import { ORPCError } from "@orpc/server"
import { base } from "../../orpc/base"

/** `shop.catalog.product`: one `product_view` row; unknown, unpublished or other-channel slug 404. */
export const getCatalogProduct = base.shop.catalog.product.handler(async ({ input, context }) => {
  const product = await getProductView(context.ctx, input.slug)
  if (!product) throw new ORPCError("NOT_FOUND", { message: "ürün bulunamadı" })
  return { product }
})
