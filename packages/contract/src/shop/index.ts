import { shopAccount } from "./account"
import { shopCart } from "./cart"
import { shopCatalog } from "./catalog"
import { shopCheckout } from "./checkout"
import { shopHealth } from "./health"
import { shopOrders } from "./orders"

/** Shop API contract; one file per resource (`shop/<resource>.ts`). */
export const shop = {
  health: shopHealth,
  account: shopAccount,
  catalog: shopCatalog,
  cart: shopCart,
  checkout: shopCheckout,
  orders: shopOrders,
}

export {
  customerEmailSchema,
  customerPasswordSchema,
  shopAccount,
  shopAddressInput,
  shopAddressOutput,
} from "./account"
export { shopCart, shopCartView } from "./cart"
export { shopCatalog, shopCatalogCard, shopCatalogPage } from "./catalog"
export { shopCheckout } from "./checkout"
export { shopHealth, shopHealthOutput } from "./health"
export {
  orderRefSchema,
  orderSummarySchema,
  orderViewSchema,
  shopOrders,
} from "./orders"
