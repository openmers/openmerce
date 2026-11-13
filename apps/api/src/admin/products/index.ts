import { createProductRoute } from "./create"
import { deleteProductRoute } from "./delete"
import { getProductRoute } from "./get"
import { listProductsRoute } from "./list"
import { updateProductRoute } from "./update"
import { createVariantRoute } from "./variants/create"
import { removeVariantRoute } from "./variants/remove"
import { updateVariantRoute } from "./variants/update"

/** Admin katalog router'ı: sözleşmeyle aynı biçim (`contract.admin.products`). */
export const productsRouter = {
  list: listProductsRoute,
  get: getProductRoute,
  create: createProductRoute,
  update: updateProductRoute,
  delete: deleteProductRoute,
  variants: {
    create: createVariantRoute,
    update: updateVariantRoute,
    remove: removeVariantRoute,
  },
}
