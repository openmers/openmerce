import { deleteMedia } from "@openmers/core"
import { base } from "../../orpc/base"
import { rethrowCommerce } from "../../orpc/commerceErrors"

/** `admin.media.delete`: refused with 409 while anything still uses the item. */
export const deleteMediaRoute = base.admin.media.delete.handler(async ({ input, context }) => {
  await deleteMedia(context.ctx, { id: input.id }).catch(rethrowCommerce)
  return { ok: true as const }
})
