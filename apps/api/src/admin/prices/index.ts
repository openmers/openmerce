import { getPrices, setPrices } from "@openmers/core"
import { base } from "../../orpc/base"
import { rethrowCommerce } from "../errors"

/** `admin.prices.get`: a single `IN` query (via the PK). */
const getPricesRoute = base.admin.prices.get.handler(({ input, context }) =>
  getPrices(context.ctx, input),
)

/** `admin.prices.set`: one result per entry; unknown list 404. */
const setPricesRoute = base.admin.prices.set.handler(async ({ input, context }) => {
  try {
    return await setPrices(context.ctx, input)
  } catch (error) {
    rethrowCommerce(error)
  }
})

export const pricesRouter = { get: getPricesRoute, set: setPricesRoute }
