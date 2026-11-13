import { ORPCError } from "@orpc/server"
import { isAPIError } from "better-auth/api"
import { forwardSetCookies } from "../../auth/cookies"
import { base } from "../../orpc/base"

// Thin Better Auth wrappers; rate limiting is the Hono `login` bucket (`/auth/` path).

/** Sign-up: always `ok` (Better Auth answers an existing email generically); the mail is an outbox row. */
export const signUp = base.shop.account.auth.signUp.handler(async ({ input, context }) => {
  try {
    await context.customerAuth.api.signUpEmail({
      body: { email: input.email, password: input.password, name: input.name ?? "" },
      headers: context.reqHeaders,
    })
  } catch (error) {
    if (isAPIError(error)) throw new ORPCError("INVALID_INPUT")
    throw error
  }
  return { ok: true as const }
})

export const verifyEmail = base.shop.account.auth.verifyEmail.handler(
  async ({ input, context }) => {
    try {
      await context.customerAuth.api.verifyEmail({
        query: { token: input.token },
        headers: context.reqHeaders,
      })
    } catch (error) {
      if (isAPIError(error)) throw new ORPCError("INVALID_INPUT")
      throw error
    }
    return { ok: true as const }
  },
)

/** Wrong password, unknown email and unverified account all get the same `UNAUTHENTICATED`. */
export const signIn = base.shop.account.auth.signIn.handler(async ({ input, context }) => {
  let headers: Headers
  try {
    ;({ headers } = await context.customerAuth.api.signInEmail({
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

export const signOut = base.shop.account.auth.signOut.handler(async ({ context }) => {
  try {
    const { headers } = await context.customerAuth.api.signOut({
      headers: context.reqHeaders,
      returnHeaders: true,
    })
    forwardSetCookies(headers, context.resHeaders, context.https)
  } catch (error) {
    if (!isAPIError(error)) throw error
  }
  return { ok: true as const }
})
