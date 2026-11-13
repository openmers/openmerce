import { type CustomerActor, loadCustomerActor } from "@openmers/core"
import { forwardSetCookies } from "../auth/cookies"
import { CUSTOMER_SESSION_COOKIE } from "../auth/customerAuth"
import type { ApiInitialContext } from "./base"

/**
 * Shop surface session: only `om_s` is read (the admin cookie means nothing here). Without the cookie
 * nothing is queried, so the anonymous path stays at zero database round trips.
 */
export async function loadShopCustomer(context: ApiInitialContext): Promise<CustomerActor | null> {
  const cookie = context.reqHeaders.get("cookie") ?? ""
  if (!cookie.includes(`${CUSTOMER_SESSION_COOKIE}=`)) return null
  const result = await context.customerAuth.api.getSession({
    headers: context.reqHeaders,
    returnHeaders: true,
  })
  // Sliding session: a renewed cookie is carried onto the response.
  forwardSetCookies(result.headers, context.resHeaders, context.https)
  const session = result.response
  if (!session) return null
  return loadCustomerActor(context.platform, {
    sessionId: Number(session.session.id),
    userId: Number(session.user.id),
  })
}
