import { z } from "zod"
import { adminProcedure } from "../shared/adminProcedure"

// Parola sınırları: alt sınır Better Auth varsayılanı (8), üst sınır özetleme maliyetini sınırlar.
export const adminPasswordSchema = z.string().min(8).max(128)
export const adminEmailSchema = z.email().max(254)

const okOutput = z.object({ ok: z.literal(true) })

/**
 * `admin.setup.create`: ilk yönetici (`SuperAdmin`) + kurulum kilidi; yalnız kurulum bitmeden açık.
 * Dönen kimlik `adm_` önekli `public_id`'dir.
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

/** `admin.auth.login`: e-posta + parola; çerez `om_a`. Hata yanıtı hesabın varlığını belli etmez. */
export const adminAuthLogin = adminProcedure("public")
  .input(z.object({ email: adminEmailSchema, password: adminPasswordSchema }))
  .output(okOutput)

/** `admin.auth.logout`: oturum satırını siler, çerezi temizler; oturum yoksa da `ok`. */
export const adminAuthLogout = adminProcedure("public").output(okOutput)

/** `admin.me`: oturumdaki yönetici ve bu kanaldaki izinleri. İç kimlik dönmez. */
export const adminMe = adminProcedure("session").output(
  z.object({
    admin: z.object({ id: z.string(), name: z.string(), email: z.string() }),
    permissions: z.array(z.string()),
  }),
)
