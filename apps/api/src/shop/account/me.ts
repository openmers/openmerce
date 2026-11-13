import { getAccountProfile } from "@openmers/core"
import { ORPCError } from "@orpc/server"
import { base } from "../../orpc/base"
import { requireCustomer } from "./requireCustomer"

/** `shop.account.me`: the session customer's profile; no internal id. */
export const getMe = base.shop.account.me.handler(async ({ context }) => {
  const customer = requireCustomer(context)
  const profile = await getAccountProfile(context.platform, customer.id)
  if (!profile) throw new ORPCError("UNAUTHENTICATED")
  return {
    customer: {
      id: profile.publicId,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      version: profile.version,
    },
  }
})
