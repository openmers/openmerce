import type { Platform } from "@openmers/core"
import * as schema from "@openmers/db"
import { type BetterAuthOptions, betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { eq } from "drizzle-orm"
import { withHashedSessionTokens } from "./hashedSessions"

/** Admin session cookie (`08-kimlik-dogrulama` §1); the storefront cookie `om_s` is a separate instance. */
export const ADMIN_SESSION_COOKIE = "om_a"

export type AdminAuthOptions = {
  db: Platform["db"]
  /** Cookie signing secret; at least 32 characters. */
  secret: string
}

/**
 * Better Auth 1.7.23 admin instance (catalog decision 13): `admin_*` tables via `modelName`/`fields`,
 * integer ids with `generateId: "serial"`, email + password only, sign-up disabled (first account via
 * `createFirstAdmin`, the rest by invitation). The session token is stored only as a SHA-256 hash
 * (`withHashedSessionTokens`). Better Auth's own HTTP handler is not mounted; endpoints live in oRPC.
 * The `Secure` flag is added per request (HTTPS) in the oRPC layer, so it is off here.
 */
export function createAdminAuth(opts: AdminAuthOptions) {
  const { db } = opts
  return betterAuth({
    appName: "openmers-admin",
    secret: opts.secret,
    database: (options: BetterAuthOptions) =>
      withHashedSessionTokens(drizzleAdapter(db, { provider: "sqlite", schema })(options)),
    emailAndPassword: { enabled: true, disableSignUp: true },
    user: { modelName: "adminUsers" },
    account: { modelName: "adminAccounts", fields: { userId: "adminUserId" } },
    verification: { modelName: "adminVerifications" },
    session: {
      modelName: "adminSessions",
      fields: { userId: "adminUserId" },
      // Short and expiring on inactivity: 8 hours, sliding every 15 minutes.
      expiresIn: 60 * 60 * 8,
      updateAge: 60 * 15,
      additionalFields: {
        sessionVersion: { type: "number", input: false, returned: true },
        // shortcut: permissions are resolved per request (`loadAdminActor`); writing a permission/policy snapshot
        // to the session comes with the session cache (item 12.5). Type "string" + object: Drizzle encodes the `json`
        // column itself (with type "json" Better Auth would encode too, encoding it twice).
        permissions: {
          type: "string",
          input: false,
          returned: false,
          transform: { input: () => ({}) as never },
        },
      },
    },
    databaseHooks: {
      session: {
        create: {
          // Suspended/invited admins cannot log in; the session carries the admin's current version.
          async before(session) {
            const [admin] = await db
              .select({
                status: schema.adminUsers.status,
                version: schema.adminUsers.sessionVersion,
              })
              .from(schema.adminUsers)
              .where(eq(schema.adminUsers.id, Number(session.userId)))
              .limit(1)
            if (admin?.status !== "active") return false
            return { data: { ...session, sessionVersion: admin.version } }
          },
        },
      },
    },
    advanced: {
      database: { generateId: "serial" },
      useSecureCookies: false,
      cookies: { session_token: { name: ADMIN_SESSION_COOKIE } },
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
    },
    // Rate limiting lives in the Hono layer (`login` bucket); Better Auth's in-memory counter is off.
    rateLimit: { enabled: false },
    telemetry: { enabled: false },
  })
}

export type AdminAuth = ReturnType<typeof createAdminAuth>
