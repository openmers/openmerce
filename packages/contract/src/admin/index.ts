import { adminAuthLogin, adminAuthLogout, adminMe, adminSetupCreate } from "./auth"
import { adminPriceLists, adminPrices } from "./pricing"
import { adminProducts } from "./products"
import { adminStock } from "./stock"

// Admin API sözleşmesi: her uç `adminProcedure(erişim)` ile başlar (izin meta'sı zorunlu).
// Kurulum prosedürleri `setup.` altındadır (`setupGate` bu öneke bakar).
export const admin = {
  setup: { create: adminSetupCreate },
  auth: { login: adminAuthLogin, logout: adminAuthLogout },
  me: adminMe,
  products: adminProducts,
  priceLists: adminPriceLists,
  prices: adminPrices,
  stock: adminStock,
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
  adminPriceLists,
  adminPriceListsCreate,
  adminPriceListsDelete,
  adminPriceListsList,
  adminPriceListsUpdate,
  adminPrices,
  adminPricesGet,
  adminPricesSet,
} from "./pricing"
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
export {
  adminStock,
  adminStockLevelsAdjust,
  adminStockLevelsGet,
  adminStockLocationsCreate,
  adminStockLocationsList,
} from "./stock"
