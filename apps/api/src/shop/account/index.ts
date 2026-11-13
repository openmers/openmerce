import { addressesRouter } from "./addresses"
import { signIn, signOut, signUp, verifyEmail } from "./auth"
import { getMe } from "./me"

/** Shop account router: same shape as `contract.shop.account`. */
export const accountRouter = {
  auth: { signUp, verifyEmail, signIn, signOut },
  me: getMe,
  addresses: addressesRouter,
}
