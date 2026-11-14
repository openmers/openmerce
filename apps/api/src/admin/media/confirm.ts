import { ADMIN_UPLOADS, confirmUpload } from "@openmers/core"
import { base } from "../../orpc/base"
import { rethrowCommerce } from "../../orpc/commerceErrors"

/** `admin.media.confirm`: checks the uploaded bytes; public images get the size ladder. */
export const confirmMedia = base.admin.media.confirm.handler(async ({ input, context }) => {
  const r = await confirmUpload(context.ctx, { id: input.id, policy: ADMIN_UPLOADS }).catch(
    rethrowCommerce,
  )
  return { id: r.id, status: r.status, width: r.width, height: r.height, reason: r.reason ?? null }
})
