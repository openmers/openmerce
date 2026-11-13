import { priceLists, prices, productVariants } from "@openmers/db"
import { and, asc, eq, inArray, isNull, type SQL } from "drizzle-orm"
import type { Db } from "../../../platform"
import type { PriceCandidate } from "../resolve/resolvePrice"
import type { PricingCtx } from "../types"

export type GetPricesInput = {
  variantPublicIds: readonly string[]
  /** Verilmezse kanalın bütün listeleri; verilirse yalnız bunlar (oturum kümesi). */
  priceListPublicIds?: readonly string[]
}

/** Fiyat satırı + listenin seçim alanları; çözümleyici (`resolvePrice`) doğrudan bunu alır. */
export type PriceRow = PriceCandidate & { variant: string }

/**
 * Tek sorgu: `price_list_id IN (...) AND variant_id IN (...)`; `prices` PK'si
 * `(price_list_id, variant_id, min_qty)` ile karşılanır (`assertNoFullScan` testi).
 */
export function getPricesQuery(db: Db, channelId: number, input: GetPricesInput) {
  const listFilter: SQL[] = [eq(priceLists.channelId, channelId)]
  if (input.priceListPublicIds) {
    listFilter.push(inArray(priceLists.publicId, [...input.priceListPublicIds]))
  }
  const listIds = db
    .select({ id: priceLists.id })
    .from(priceLists)
    .where(and(...listFilter))
  const variantIds = db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(
      and(
        inArray(productVariants.publicId, [...input.variantPublicIds]),
        isNull(productVariants.deletedAt),
      ),
    )
  return db
    .select({
      priceList: priceLists.publicId,
      type: priceLists.type,
      priority: priceLists.priority,
      startsAt: priceLists.startsAt,
      endsAt: priceLists.endsAt,
      status: priceLists.status,
      variant: productVariants.publicId,
      minQty: prices.minQty,
      amount: prices.amount,
      compareAtAmount: prices.compareAtAmount,
      currency: prices.currency,
    })
    .from(prices)
    .innerJoin(priceLists, eq(priceLists.id, prices.priceListId))
    .innerJoin(productVariants, eq(productVariants.id, prices.variantId))
    .where(and(inArray(prices.priceListId, listIds), inArray(prices.variantId, variantIds)))
    .orderBy(asc(productVariants.publicId), asc(priceLists.publicId), asc(prices.minQty))
}

/** Admin ve çözümleme okuması; boş varyant listesinde sorgu atılmaz. */
export async function getPrices(
  ctx: Pick<PricingCtx, "platform" | "channel">,
  input: GetPricesInput,
): Promise<PriceRow[]> {
  if (input.variantPublicIds.length === 0) return []
  if (input.priceListPublicIds?.length === 0) return []
  return getPricesQuery(ctx.platform.db, ctx.channel.id, input)
}
