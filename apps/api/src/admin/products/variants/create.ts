import { addVariant } from "@openmers/core"
import { base } from "../../../orpc/base"
import { rethrowCatalog } from "../errors"

/** `admin.products.variants.create`: adds a variant to the product; 404 if the product is missing. */
export const createVariantRoute = base.admin.products.variants.create.handler(
  async ({ input, context }) => {
    try {
      const created = await addVariant(context.ctx, input)
      return { ok: true as const, ...created }
    } catch (error) {
      rethrowCatalog(error)
    }
  },
)
