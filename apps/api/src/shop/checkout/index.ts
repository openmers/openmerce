import { reserve } from "./reserve"
import { checkoutReturn } from "./return"

/** Shop checkout router: same shape as `contract.shop.checkout`. */
export const checkoutRouter = { reserve, return: checkoutReturn }
