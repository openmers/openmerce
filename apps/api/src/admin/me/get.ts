import { ORPCError } from "@orpc/server"
import { base } from "../../orpc/base"

/** `admin.me`: the session's admin (`public_id`) and their permissions in this channel, sorted. */
export const getMe = base.admin.me.handler(({ context }) => {
  const { admin } = context
  // The root middleware fills the actor for "session" access; reaching here empty is a gate bug.
  if (!admin) throw new ORPCError("UNAUTHENTICATED")
  return {
    admin: { id: admin.publicId, name: admin.name, email: admin.email },
    permissions: [...admin.permissions].sort(),
  }
})
