import { ORPCError } from "@orpc/server"
import { isAPIError } from "better-auth/api"
import { forwardSetCookies } from "../../auth/cookies"
import { base } from "../../orpc/base"

/**
 * `admin.auth.login`: Better Auth `signInEmail`. Yanlış parola, olmayan e-posta ve askıdaki hesap
 * aynı `UNAUTHENTICATED` yanıtını alır (Better Auth olmayan hesapta da parola özetler: süre aynı).
 * Hız sınırı Hono'da `login` kovası (`/auth/` yolu).
 */
export const login = base.admin.auth.login.handler(async ({ input, context }) => {
  let headers: Headers
  try {
    ;({ headers } = await context.adminAuth.api.signInEmail({
      body: { email: input.email, password: input.password },
      headers: context.reqHeaders,
      returnHeaders: true,
    }))
  } catch (error) {
    if (isAPIError(error)) throw new ORPCError("UNAUTHENTICATED")
    throw error
  }
  forwardSetCookies(headers, context.resHeaders, context.https)
  return { ok: true as const }
})
