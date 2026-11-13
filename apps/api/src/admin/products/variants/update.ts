import { updateVariant } from "@openmers/core"
import { base } from "../../../orpc/base"
import { rethrowCatalog } from "../errors"

/** `admin.products.variants.update`: `version` koşullu; çakışmada 409 `CONFLICT`. */
export const updateVariantRoute = base.admin.products.variants.update.handler(
  async ({ input, context }) => {
    try {
      const updated = await updateVariant(context.ctx, input)
      return { ok: true as const, ...updated }
    } catch (error) {
      rethrowCatalog(error)
    }
  },
)
