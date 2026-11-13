import { removeVariant } from "@openmers/core"
import { base } from "../../../orpc/base"
import { rethrowCatalog } from "../errors"

/** `admin.products.variants.remove`: soft delete; **the last variant cannot be deleted** (400). */
export const removeVariantRoute = base.admin.products.variants.remove.handler(
  async ({ input, context }) => {
    try {
      const removed = await removeVariant(context.ctx, input)
      return { ok: true as const, ...removed }
    } catch (error) {
      rethrowCatalog(error)
    }
  },
)
