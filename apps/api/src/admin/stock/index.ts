import {
  adjustStock,
  createLocation,
  getStockLevels,
  linkLocationToChannel,
  listLocations,
} from "@openmers/core"
import { base } from "../../orpc/base"
import { rethrowCommerce } from "../errors"

const listLocationsRoute = base.admin.stock.locations.list.handler(({ context }) =>
  listLocations(context.ctx),
)

/** Warehouse + (optionally) channel link; two separate writes, the link is idempotent (upsert). */
const createLocationRoute = base.admin.stock.locations.create.handler(
  async ({ input, context }) => {
    const { channelPriority, ...location } = input
    try {
      const created = await createLocation(context.ctx, location)
      if (channelPriority !== undefined) {
        await linkLocationToChannel(context.ctx, {
          locationPublicId: created.publicId,
          priority: channelPriority,
        })
      }
      return { ok: true as const, ...created }
    } catch (error) {
      rethrowCommerce(error)
    }
  },
)

const getLevelsRoute = base.admin.stock.levels.get.handler(({ input, context }) =>
  getStockLevels(context.ctx, input.variantPublicId),
)

/** `admin.stock.levels.adjust`: level + movement in one `atomic()`; negative result 400. */
const adjustRoute = base.admin.stock.levels.adjust.handler(async ({ input, context }) => {
  try {
    await adjustStock(context.ctx, input)
    return { ok: true as const }
  } catch (error) {
    rethrowCommerce(error)
  }
})

export const stockRouter = {
  locations: { list: listLocationsRoute, create: createLocationRoute },
  levels: { get: getLevelsRoute, adjust: adjustRoute },
}
