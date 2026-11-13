import { shippingMethodChannels, shippingMethods } from "@openmers/db"
import type { Platform } from "../../../platform"
import { mapRow } from "../../channels/queries/loadChannels"
import type { ShippingMethod } from "../types"

/** Shipping methods + channel links, in one round trip via `batch` (kept in memory). */
export async function loadShippingMethods(
  p: Pick<Platform, "db" | "batch">,
): Promise<ShippingMethod[]> {
  const [methodRows = [], linkRows = []] = await p.batch([
    p.db.select().from(shippingMethods).orderBy(shippingMethods.id).toSQL(),
    p.db
      .select()
      .from(shippingMethodChannels)
      .orderBy(shippingMethodChannels.shippingMethodId, shippingMethodChannels.channelId)
      .toSQL(),
  ])
  const byId = new Map<number, ShippingMethod>()
  for (const row of methodRows) {
    const m = mapRow(shippingMethods, row)
    byId.set(m.id, {
      id: m.id,
      publicId: m.publicId,
      name: m.name,
      zoneId: m.zoneId,
      checkerCode: m.checkerCode,
      checkerArgs: m.checkerArgs,
      calculatorCode: m.calculatorCode,
      calculatorArgs: m.calculatorArgs,
      taxCategoryId: m.taxCategoryId,
      pickupLocationId: m.pickupLocationId,
      channelIds: [],
    })
  }
  for (const row of linkRows) {
    const l = mapRow(shippingMethodChannels, row)
    byId.get(l.shippingMethodId)?.channelIds.push(l.channelId)
  }
  return [...byId.values()]
}
