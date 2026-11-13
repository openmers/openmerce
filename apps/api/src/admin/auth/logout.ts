import { isAPIError } from "better-auth/api"
import { forwardSetCookies } from "../../auth/cookies"
import { base } from "../../orpc/base"

/** `admin.auth.logout`: deletes the session row and clears `om_a`; returns `ok` even without a session. */
export const logout = base.admin.auth.logout.handler(async ({ context }) => {
  try {
    const { headers } = await context.adminAuth.api.signOut({
      headers: context.reqHeaders,
      returnHeaders: true,
    })
    forwardSetCookies(headers, context.resHeaders, context.https)
  } catch (error) {
    if (!isAPIError(error)) throw error
  }
  return { ok: true as const }
})
