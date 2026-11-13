import { login } from "./auth/login"
import { logout } from "./auth/logout"
import { getMe } from "./me/get"
import { productsRouter } from "./products"
import { createSetup } from "./setup/create"

/** Admin router'ı: sözleşmeyle aynı biçim (`contract.admin`). */
export const adminRouter = {
  setup: { create: createSetup },
  auth: { login, logout },
  me: getMe,
  products: productsRouter,
}
