import { updateProduct } from "@openmers/core"
import { base } from "../../orpc/base"
import { rethrowCatalog } from "./errors"

/** `admin.products.update`: `version` koşullu; çakışmada 409 `CONFLICT`. */
export const updateProductRoute = base.admin.products.update.handler(async ({ input, context }) => {
  try {
    const updated = await updateProduct(context.ctx, input)
    return { ok: true as const, ...updated }
  } catch (error) {
    rethrowCatalog(error)
  }
})
