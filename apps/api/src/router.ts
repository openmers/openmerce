import { adminRouter } from "./admin"
import { accountRouter } from "./shop/account"
import { cartRouter } from "./shop/cart"
import { catalogRouter } from "./shop/catalog"
import { checkoutRouter } from "./shop/checkout"
import { getHealth } from "./shop/health/get"
import { ordersRouter } from "./shop/orders"
import { uploadsRouter } from "./shop/uploads"

/**
 * The implemented router: same shape as the contract. `createRouterClient(router, { context })` lets the
 * storefront SSR call it in-process without going over HTTP (`02-api-ve-istek-baglami` §11); the client
 * factory is out of scope for this item.
 */
export const router = {
  shop: {
    health: getHealth,
    account: accountRouter,
    catalog: catalogRouter,
    cart: cartRouter,
    checkout: checkoutRouter,
    orders: ordersRouter,
    uploads: uploadsRouter,
  },
  admin: adminRouter,
}

export type ApiRouter = typeof router
