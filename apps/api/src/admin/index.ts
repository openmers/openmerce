import { login } from "./auth/login"
import { logout } from "./auth/logout"
import { getMe } from "./me/get"
import { priceListsRouter } from "./price-lists"
import { pricesRouter } from "./prices"
import { productsRouter } from "./products"
import { createSetup } from "./setup/create"
import { stockRouter } from "./stock"

/** Admin router: same shape as the contract (`contract.admin`). */
export const adminRouter = {
  setup: { create: createSetup },
  auth: { login, logout },
  me: getMe,
  products: productsRouter,
  priceLists: priceListsRouter,
  prices: pricesRouter,
  stock: stockRouter,
}
