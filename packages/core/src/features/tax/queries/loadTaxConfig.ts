import { taxCategories, taxRates, zoneMembers, zones } from "@openmers/db"
import type { Platform } from "../../../platform"
import { mapRow } from "../../channels/queries/loadChannels"
import type { TaxConfig, Zone } from "../types"

/** Zones + members + categories + rates, in one round trip via `batch` (09-vergi §1). */
export async function loadTaxConfig(p: Pick<Platform, "db" | "batch">): Promise<TaxConfig> {
  const [zoneRows = [], memberRows = [], categoryRows = [], rateRows = []] = await p.batch([
    p.db.select().from(zones).orderBy(zones.id).toSQL(),
    p.db
      .select()
      .from(zoneMembers)
      .orderBy(zoneMembers.zoneId, zoneMembers.country, zoneMembers.region)
      .toSQL(),
    p.db.select().from(taxCategories).orderBy(taxCategories.id).toSQL(),
    p.db.select().from(taxRates).orderBy(taxRates.id).toSQL(),
  ])
  const byId = new Map<number, Zone>()
  for (const row of zoneRows) {
    const z = mapRow(zones, row)
    byId.set(z.id, { id: z.id, publicId: z.publicId, name: z.name, members: [] })
  }
  for (const row of memberRows) {
    const m = mapRow(zoneMembers, row)
    byId.get(m.zoneId)?.members.push({ country: m.country, region: m.region })
  }
  return {
    zones: [...byId.values()],
    categories: categoryRows.map((row) => {
      const c = mapRow(taxCategories, row)
      return { id: c.id, code: c.code, name: c.name }
    }),
    rates: rateRows.map((row) => {
      const r = mapRow(taxRates, row)
      return {
        id: r.id,
        publicId: r.publicId,
        zoneId: r.zoneId,
        taxCategoryId: r.taxCategoryId,
        customerGroupId: r.customerGroupId,
        rateBp: r.rateBp,
      }
    }),
  }
}
