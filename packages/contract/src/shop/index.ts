import { shopAccount } from "./account"
import { shopHealth } from "./health"

/** Shop API contract; one file per resource (`shop/<resource>.ts`). */
export const shop = { health: shopHealth, account: shopAccount }

export {
  customerEmailSchema,
  customerPasswordSchema,
  shopAccount,
  shopAddressInput,
  shopAddressOutput,
} from "./account"
export { shopHealth, shopHealthOutput } from "./health"
