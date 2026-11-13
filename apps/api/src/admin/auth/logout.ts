import { isAPIError } from "better-auth/api"
import { forwardSetCookies } from "../../auth/cookies"
import { base } from "../../orpc/base"

/** `admin.auth.logout`: oturum satırı silinir, `om_a` temizlenir; oturum yoksa da `ok`. */
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
