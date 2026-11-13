import { createProduct } from "@openmers/core"
import { base } from "../../orpc/base"
import { rethrowCatalog } from "./errors"

/** `admin.products.create`: product + options + variants in one `atomic()`; no price/stock written. */
export const createProductRoute = base.admin.products.create.handler(async ({ input, context }) => {
  try {
    const created = await createProduct(context.ctx, input)
    return { ok: true as const, ...created }
  } catch (error) {
    rethrowCatalog(error)
  }
})
