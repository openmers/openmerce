import { listProducts } from "@openmers/core"
import { base } from "../../orpc/base"
import { rethrowCatalog } from "./errors"

/** `admin.products.list`: imleçli normalize liste; `products:read`. */
export const listProductsRoute = base.admin.products.list.handler(async ({ input, context }) => {
  try {
    return await listProducts(context.ctx, input)
  } catch (error) {
    rethrowCatalog(error)
  }
})
