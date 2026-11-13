import type { Platform } from "@openmers/core"
import * as schema from "@openmers/db"
import { type BetterAuthOptions, betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { eq } from "drizzle-orm"
import { withHashedSessionTokens } from "./hashedSessions"

/** Yönetici oturum çerezi (`08-kimlik-dogrulama` §1); vitrin çerezi `om_s` ayrı örnektedir. */
export const ADMIN_SESSION_COOKIE = "om_a"

export type AdminAuthOptions = {
  db: Platform["db"]
  /** Çerez imzası; en az 32 karakter. */
  secret: string
}

/**
 * Better Auth 1.7.23 yönetici örneği (katalog karar 13): `admin_*` tabloları `modelName`/`fields`
 * ile, tamsayı kimlik `generateId: "serial"`, yalnız e-posta + parola, kayıt kapalı (ilk hesap
 * `createFirstAdmin`, sonrakiler davetle). Oturum token'ı veritabanında yalnız SHA-256 özetidir
 * (`withHashedSessionTokens`). Better Auth'un kendi HTTP işleyicisi bağlanmaz; uçlar oRPC'dedir.
 * `Secure` bayrağı istek başına (HTTPS) oRPC katmanında eklenir, bu yüzden burada kapalıdır.
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
      // Kısa ve hareketsizlikte biten: 8 saat, 15 dakikada bir kayar.
      expiresIn: 60 * 60 * 8,
      updateAge: 60 * 15,
      additionalFields: {
        sessionVersion: { type: "number", input: false, returned: true },
        // shortcut: izinler istek başına çözülür (`loadAdminActor`); oturuma izin/politika görüntüsü
        // yazımı oturum önbelleğiyle (madde 12.5) gelir. Tür "string" + nesne: Drizzle `json`
        // sütunu kendisi kodlar (tür "json" olsa Better Auth da kodlar, iki kez kodlanır).
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
          // Askıdaki/davetli yönetici oturum açamaz; oturum yöneticinin güncel sürümünü taşır.
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
    // Hız sınırı Hono katmanında (`login` kovası); Better Auth'un bellek sayacı kapalı.
    rateLimit: { enabled: false },
    telemetry: { enabled: false },
  })
}

export type AdminAuth = ReturnType<typeof createAdminAuth>
