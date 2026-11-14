import { confirmUploadRoute } from "./confirm"
import { createUploadRoute } from "./create"

/** Shop uploads router: same shape as `contract.shop.uploads`. */
export const uploadsRouter = { create: createUploadRoute, confirm: confirmUploadRoute }
