import { ORPCError } from "@orpc/server"
import { base } from "../../orpc/base"

/** `admin.me`: oturumdaki yönetici (`public_id`) ve bu kanaldaki izinleri, sıralı. */
export const getMe = base.admin.me.handler(({ context }) => {
  const { admin } = context
  // Kök ara katman "session" erişiminde aktörü doldurur; buraya boş düşmesi kapı hatasıdır.
  if (!admin) throw new ORPCError("UNAUTHENTICATED")
  return {
    admin: { id: admin.publicId, name: admin.name, email: admin.email },
    permissions: [...admin.permissions].sort(),
  }
})
