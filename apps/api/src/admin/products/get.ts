import { getProduct } from "@openmers/core"
import { ORPCError } from "@orpc/server"
import { base } from "../../orpc/base"

/** `admin.products.get`: normalized read; deleted or unknown product 404. */
export const getProductRoute = base.admin.products.get.handler(async ({ input, context }) => {
  const product = await getProduct(context.ctx, input.publicId)
  if (!product) throw new ORPCError("NOT_FOUND", { message: "ürün bulunamadı" })
  return product
})
