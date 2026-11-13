import { priceLists, prices, productVariants } from "@openmers/db"
import { and, asc, eq, inArray, isNull, type SQL } from "drizzle-orm"
import type { Db } from "../../../platform"
import type { PriceCandidate } from "../resolve/resolvePrice"
import type { PricingCtx } from "../types"

export type GetPricesInput = {
  variantPublicIds: readonly string[]
  /** If not given, all of the channel's lists; if given, only these (the session set). */
  priceListPublicIds?: readonly string[]
}

/** Price row + the list's selection fields; the resolver (`resolvePrice`) takes this directly. */
export type PriceRow = PriceCandidate & { variant: string }

/**
 * A single query: `price_list_id IN (...) AND variant_id IN (...)`; served by the `prices` PK
 * `(price_list_id, variant_id, min_qty)` (`assertNoFullScan` test).
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

/** Admin and resolution read; no query is issued for an empty variant list. */
export async function getPrices(
  ctx: Pick<PricingCtx, "platform" | "channel">,
  input: GetPricesInput,
): Promise<PriceRow[]> {
  if (input.variantPublicIds.length === 0) return []
  if (input.priceListPublicIds?.length === 0) return []
  return getPricesQuery(ctx.platform.db, ctx.channel.id, input)
}
