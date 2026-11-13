import { adminAuthLogin, adminAuthLogout, adminMe, adminSetupCreate } from "./auth"
import { adminProducts } from "./products"

// Admin API sözleşmesi: her uç `adminProcedure(erişim)` ile başlar (izin meta'sı zorunlu).
// Kurulum prosedürleri `setup.` altındadır (`setupGate` bu öneke bakar).
export const admin = {
  setup: { create: adminSetupCreate },
  auth: { login: adminAuthLogin, logout: adminAuthLogout },
  me: adminMe,
  products: adminProducts,
}

export {
  adminAuthLogin,
  adminAuthLogout,
  adminEmailSchema,
  adminMe,
  adminPasswordSchema,
  adminSetupCreate,
} from "./auth"
export {
  adminProducts,
  adminProductsCreate,
  adminProductsDelete,
  adminProductsGet,
  adminProductsList,
  adminProductsUpdate,
  adminVariantsCreate,
  adminVariantsRemove,
  adminVariantsUpdate,
} from "./products"
