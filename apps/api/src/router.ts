import { adminRouter } from "./admin"
import { accountRouter } from "./shop/account"
import { catalogRouter } from "./shop/catalog"
import { getHealth } from "./shop/health/get"

/**
 * The implemented router: same shape as the contract. `createRouterClient(router, { context })` lets the
 * storefront SSR call it in-process without going over HTTP (`02-api-ve-istek-baglami` §11); the client
 * factory is out of scope for this item.
 */
export const router = {
  shop: { health: getHealth, account: accountRouter, catalog: catalogRouter },
  admin: adminRouter,
}

export type ApiRouter = typeof router
