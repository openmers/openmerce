import { z } from "zod"
import { adminProcedure } from "../shared/adminProcedure"

// Password limits: the minimum is Better Auth's default (8), the maximum caps hashing cost.
export const adminPasswordSchema = z.string().min(8).max(128)
export const adminEmailSchema = z.email().max(254)

const okOutput = z.object({ ok: z.literal(true) })

/**
 * `admin.setup.create`: first admin (`SuperAdmin`) + setup lock; only open before setup is done.
 * The returned id is a `public_id` with the `adm_` prefix.
 */
export const adminSetupCreate = adminProcedure("public")
  .input(
    z.object({
      name: z.string().trim().min(1).max(100),
      email: adminEmailSchema,
      password: adminPasswordSchema,
    }),
  )
  .output(z.object({ ok: z.literal(true), adminId: z.string() }))

/** `admin.auth.login`: email + password; cookie `om_a`. The error response does not reveal whether the account exists. */
export const adminAuthLogin = adminProcedure("public")
  .input(z.object({ email: adminEmailSchema, password: adminPasswordSchema }))
  .output(okOutput)

/** `admin.auth.logout`: deletes the session row and clears the cookie; returns `ok` even without a session. */
export const adminAuthLogout = adminProcedure("public").output(okOutput)

/** `admin.me`: the session's admin and their permissions in this channel. No internal id is returned. */
export const adminMe = adminProcedure("session").output(
  z.object({
    admin: z.object({ id: z.string(), name: z.string(), email: z.string() }),
    permissions: z.array(z.string()),
  }),
)
