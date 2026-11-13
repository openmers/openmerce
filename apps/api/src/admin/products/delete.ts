import { deleteProduct } from "@openmers/core"
import { base } from "../../orpc/base"
import { rethrowCatalog } from "./errors"

/** `admin.products.delete`: yumuşak silme, `version` koşullu; `products:delete`. */
export const deleteProductRoute = base.admin.products.delete.handler(async ({ input, context }) => {
  try {
    const deleted = await deleteProduct(context.ctx, input)
    return { ok: true as const, ...deleted }
  } catch (error) {
    rethrowCatalog(error)
  }
})
