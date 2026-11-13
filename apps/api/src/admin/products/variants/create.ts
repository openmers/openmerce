import { addVariant } from "@openmers/core"
import { base } from "../../../orpc/base"
import { rethrowCatalog } from "../errors"

/** `admin.products.variants.create`: ürüne varyant ekler; ürün yoksa 404. */
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
