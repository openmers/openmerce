import { getProduct } from "@openmers/core"
import { ORPCError } from "@orpc/server"
import { base } from "../../orpc/base"

/** `admin.products.get`: normalize okuma; silinmiş ya da olmayan ürün 404. */
export const getProductRoute = base.admin.products.get.handler(async ({ input, context }) => {
  const product = await getProduct(context.ctx, input.publicId)
  if (!product) throw new ORPCError("NOT_FOUND", { message: "ürün bulunamadı" })
  return product
})
