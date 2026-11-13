import { createPriceList, deletePriceList, listPriceLists, updatePriceList } from "@openmers/core"
import { base } from "../../orpc/base"
import { rethrowCommerce } from "../errors"

/** `admin.priceLists.list`: `ctx.channel`'ın listeleri. */
const listPriceListsRoute = base.admin.priceLists.list.handler(({ context }) =>
  listPriceLists(context.ctx),
)

/** `admin.priceLists.create`: kanal × para birimi başına tek `base` (409). */
const createPriceListRoute = base.admin.priceLists.create.handler(async ({ input, context }) => {
  try {
    return { ok: true as const, ...(await createPriceList(context.ctx, input)) }
  } catch (error) {
    rethrowCommerce(error)
  }
})

const updatePriceListRoute = base.admin.priceLists.update.handler(async ({ input, context }) => {
  try {
    return { ok: true as const, ...(await updatePriceList(context.ctx, input)) }
  } catch (error) {
    rethrowCommerce(error)
  }
})

/** `admin.priceLists.delete`: `base` liste 409. */
const deletePriceListRoute = base.admin.priceLists.delete.handler(async ({ input, context }) => {
  try {
    return { ok: true as const, ...(await deletePriceList(context.ctx, input)) }
  } catch (error) {
    rethrowCommerce(error)
  }
})

/** Admin fiyat listesi router'ı: sözleşmeyle aynı biçim (`contract.admin.priceLists`). */
export const priceListsRouter = {
  list: listPriceListsRoute,
  create: createPriceListRoute,
  update: updatePriceListRoute,
  delete: deletePriceListRoute,
}
