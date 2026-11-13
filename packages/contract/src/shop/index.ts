import { shopAccount } from "./account"
import { shopCatalog } from "./catalog"
import { shopHealth } from "./health"

/** Shop API contract; one file per resource (`shop/<resource>.ts`). */
export const shop = { health: shopHealth, account: shopAccount, catalog: shopCatalog }

export {
  customerEmailSchema,
  customerPasswordSchema,
  shopAccount,
  shopAddressInput,
  shopAddressOutput,
} from "./account"
export { shopCatalog, shopCatalogCard, shopCatalogPage } from "./catalog"
export { shopHealth, shopHealthOutput } from "./health"
