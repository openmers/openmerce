import {
  commerceGroupIds,
  enqueueStatement,
  linkUserOnVerified,
  type Platform,
} from "@openmers/core"
import * as schema from "@openmers/db"
import { type BetterAuthOptions, betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { and, eq } from "drizzle-orm"
import { withHashedSessionTokens } from "./hashedSessions"

/** Storefront session cookie (`08-kimlik-dogrulama` §1); separate from the admin `om_a`. */
export const CUSTOMER_SESSION_COOKIE = "om_s"

/** Outbox event the mailer consumes; no mail is sent in the request. */
export const VERIFICATION_EMAIL_EVENT = "customer.verification_email"

export type CustomerAuthOptions = {
  platform: Platform
  /** Shared app secret; the customer instance signs with its own derived key. */
  secret: string
  now?: () => number
}

/**
 * Customer key separate from the admin key: an `om_a` signature never verifies as `om_s` and vice versa.
 * shortcut: suffix derivation (HMAC keys differ, no sync KDF available on both runtimes); move to HKDF
 * when the auth instance is built asynchronously.
 */
export function customerSecret(secret: string): string {
  return `${secret}:openmers-customer-auth`
}

/**
 * Better Auth 1.7.23 customer instance, built like `createAdminAuth`: `users/sessions/accounts/
 * auth_verifications` via `modelName`/`fields`, serial ids, SHA-256 hashed session tokens. Email + password
 * with required email verification: no session exists before verification, and `afterEmailVerification` binds
 * the customer row (`linkUserOnVerified`). The session carries the customer, its commerce groups and the
 * account's `session_version`. Long sliding session (30 days, renewed daily).
 */
export function createCustomerAuth(opts: CustomerAuthOptions) {
  const { platform } = opts
  const { db } = platform
  const now = opts.now ?? Date.now
  return betterAuth({
    appName: "openmers-shop",
    secret: customerSecret(opts.secret),
    database: (options: BetterAuthOptions) =>
      withHashedSessionTokens(drizzleAdapter(db, { provider: "sqlite", schema })(options)),
    emailAndPassword: { enabled: true, requireEmailVerification: true },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      async sendVerificationEmail({ user, url, token }) {
        await platform.atomic([
          enqueueStatement(
            db,
            {
              kind: "notify",
              event: VERIFICATION_EMAIL_EVENT,
              payload: { userId: Number(user.id), email: user.email, url, token },
            },
            now(),
          ),
        ])
      },
      async afterEmailVerification(user) {
        await linkUserOnVerified(
          { platform, now: now(), requestId: "auth" },
          { userId: Number(user.id) },
        )
      },
    },
    user: { modelName: "users" },
    account: { modelName: "accounts" },
    verification: { modelName: "authVerifications" },
    session: {
      modelName: "sessions",
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      additionalFields: {
        customerId: { type: "number", input: false, returned: true },
        sessionVersion: { type: "number", input: false, returned: true },
        // Type "string" + array: Drizzle encodes the `json` column itself (see `adminAuth` permissions).
        groupIds: { type: "string", input: false, returned: false },
        priceListIds: { type: "string", input: false, returned: false },
      },
    },
    databaseHooks: {
      session: {
        create: {
          // Only an account bound to an active customer gets a session (binding happens on verification).
          async before(session) {
            const userId = Number(session.userId)
            const [row] = await db
              .select({ id: schema.customers.id, version: schema.users.sessionVersion })
              .from(schema.customers)
              .innerJoin(schema.users, eq(schema.users.id, schema.customers.userId))
              .where(and(eq(schema.customers.userId, userId), eq(schema.customers.state, "active")))
              .limit(1)
            if (!row) return false
            const groupIds = await commerceGroupIds(platform, row.id)
            return {
              data: {
                ...session,
                customerId: row.id,
                sessionVersion: row.version,
                groupIds,
                // shortcut: price lists by group come with the group → price list resolver (pricing item).
                priceListIds: [],
              },
            }
          },
        },
      },
    },
    advanced: {
      database: { generateId: "serial" },
      useSecureCookies: false,
      cookies: { session_token: { name: CUSTOMER_SESSION_COOKIE } },
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
    },
    // Rate limiting lives in the Hono layer (`login` bucket for `/auth/` paths).
    rateLimit: { enabled: false },
    telemetry: { enabled: false },
  })
}

export type CustomerAuth = ReturnType<typeof createCustomerAuth>
