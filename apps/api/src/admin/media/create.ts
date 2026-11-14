import { ADMIN_UPLOADS, createUpload } from "@openmers/core"
import { base } from "../../orpc/base"
import { rethrowCommerce } from "../../orpc/commerceErrors"

/** `admin.media.create`: a library upload slot (`public` by default) with a signed `PUT` URL. */
export const createMedia = base.admin.media.create.handler(({ input, context }) =>
  createUpload(context.ctx, {
    mime: input.mime,
    bytes: input.bytes,
    policy: ADMIN_UPLOADS,
    bucket: input.bucket,
    prefix: "media",
  }).catch(rethrowCommerce),
)
