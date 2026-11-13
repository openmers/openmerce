import { createProduct } from "@openmers/core"
import { base } from "../../orpc/base"
import { rethrowCatalog } from "./errors"

/** `admin.products.create`: ürün + seçenek + varyant tek `atomic()`; fiyat/stok yazılmaz. */
export const createProductRoute = base.admin.products.create.handler(async ({ input, context }) => {
  try {
    const created = await createProduct(context.ctx, input)
    return { ok: true as const, ...created }
  } catch (error) {
    rethrowCatalog(error)
  }
})
