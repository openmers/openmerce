import { createFirstAdmin } from "@openmers/core"
import { ORPCError } from "@orpc/server"
import { hashPassword } from "better-auth/crypto"
import { base } from "../../orpc/base"

/**
 * `admin.setup.create`: the setup gate only lets calls through before setup is done; the call that
 * loses the race gets `SETUP_DONE`. The password is hashed with Better Auth's hasher (login uses the
 * same verifier); core only ever sees the hash.
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
