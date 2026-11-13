import { getPrices, setPrices } from "@openmers/core"
import { base } from "../../orpc/base"
import { rethrowCommerce } from "../errors"

/** `admin.prices.get`: tek `IN` sorgusu (PK'den). */
const getPricesRoute = base.admin.prices.get.handler(({ input, context }) =>
  getPrices(context.ctx, input),
)

/** `admin.prices.set`: kayıt başına sonuç; olmayan liste 404. */
const setPricesRoute = base.admin.prices.set.handler(async ({ input, context }) => {
  try {
    return await setPrices(context.ctx, input)
  } catch (error) {
    rethrowCommerce(error)
  }
})

export const pricesRouter = { get: getPricesRoute, set: setPricesRoute }
