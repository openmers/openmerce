import { createFirstAdmin } from "@openmers/core"
import { ORPCError } from "@orpc/server"
import { hashPassword } from "better-auth/crypto"
import { base } from "../../orpc/base"

/**
 * `admin.setup.create`: kurulum kapısı yalnız kurulum bitmeden geçirir; yarışı kaybeden çağrı
 * `SETUP_DONE` alır. Parola Better Auth'un özetleyicisiyle özetlenir (giriş aynı doğrulayıcıyı
 * kullanır), core özet görmez başka bir şey görmez.
 */
export const createSetup = base.admin.setup.create.handler(async ({ input, context }) => {
  const result = await createFirstAdmin(
    context.platform,
    {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      requestId: context.requestId,
    },
    context.now,
  )
  if (!result.ok) throw new ORPCError(result.code)
  return { ok: true as const, adminId: result.adminId }
})
