import { type ApplyPromotionsResult, applyPromotions } from "../../../promotions"
import type { CartData } from "../../queries/cartData"
import type { CalcConfig, PricedLine } from "../types"

/**
 * Step 2 (05-sepet §2): condition -> action, discounts allocated to lines (`applyPromotions`).
 * The surcharge is already in the line amount, so promotions work on that total. `shipping` is
 * the selected method's fee, for shipping discounts.
 */
export function promoteLines(
  data: CartData,
  lines: readonly PricedLine[],
  config: CalcConfig,
  shipping: number,
): ApplyPromotionsResult {
  return applyPromotions({
    promotions: config.promotions,
    now: config.now,
    cart: {
      channelId: data.cart.channelId,
      lines: lines.map((l) => ({
        key: l.key,
        variantId: l.variantId,
        productId: l.productId,
        quantity: l.quantity,
        amount: l.amount,
        priceType: l.priceType,
        personalized: l.personalized,
      })),
      shipping,
      customerId: data.cart.customerId,
      customerGroupIds: config.customerGroupIds ?? [],
      companyId: data.cart.companyId,
      couponCodes: data.cart.couponCodes,
      data: data.promoData,
    },
  })
}
