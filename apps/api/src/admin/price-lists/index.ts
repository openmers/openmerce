import { createPriceList, deletePriceList, listPriceLists, updatePriceList } from "@openmers/core"
import { base } from "../../orpc/base"
import { rethrowCommerce } from "../errors"

/** `admin.priceLists.list`: lists of `ctx.channel`. */
const listPriceListsRoute = base.admin.priceLists.list.handler(({ context }) =>
  listPriceLists(context.ctx),
)

/** `admin.priceLists.create`: one `base` per channel × currency (409). */
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

/** `admin.priceLists.delete`: a `base` list returns 409. */
const deletePriceListRoute = base.admin.priceLists.delete.handler(async ({ input, context }) => {
  try {
    return { ok: true as const, ...(await deletePriceList(context.ctx, input)) }
  } catch (error) {
    rethrowCommerce(error)
  }
})

/** Admin price list router: same shape as the contract (`contract.admin.priceLists`). */
export const priceListsRouter = {
  list: listPriceListsRoute,
  create: createPriceListRoute,
  update: updatePriceListRoute,
  delete: deletePriceListRoute,
}
