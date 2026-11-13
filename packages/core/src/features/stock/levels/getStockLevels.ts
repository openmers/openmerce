import { productVariants, stockLevels, stockLocations } from "@openmers/db"
import { asc, eq, sql } from "drizzle-orm"
import type { Db } from "../../../platform"
import type { StockCtx } from "../types"

export type StockLevelItem = {
  location: string
  onHand: number
  reserved: number
  safety: number
  /** `on_hand − reserved − safety` (04-stok §1). */
  available: number
  version: number
}

/** Varyantın depo satırları; `stock_levels` PK öneki `(variant_id, …)` ile (`assertNoFullScan`). */
export function getStockLevelsQuery(db: Db, variantPublicId: string) {
  const variantId = sql`(SELECT ${productVariants.id} FROM ${productVariants}
    WHERE ${productVariants.publicId} = ${variantPublicId} AND ${productVariants.deletedAt} IS NULL)`
  return db
    .select({
      location: stockLocations.publicId,
      onHand: stockLevels.onHand,
      reserved: stockLevels.reserved,
      safety: stockLevels.safety,
      version: stockLevels.version,
    })
    .from(stockLevels)
    .innerJoin(stockLocations, eq(stockLocations.id, stockLevels.locationId))
    .where(sql`${stockLevels.variantId} = ${variantId}`)
    .orderBy(asc(stockLocations.publicId))
}

export async function getStockLevels(
  ctx: Pick<StockCtx, "platform">,
  variantPublicId: string,
): Promise<StockLevelItem[]> {
  const rows = await getStockLevelsQuery(ctx.platform.db, variantPublicId)
  return rows.map((r) => ({ ...r, available: r.onHand - r.reserved - r.safety }))
}
