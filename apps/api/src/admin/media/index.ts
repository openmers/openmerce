import { confirmMedia } from "./confirm"
import { createMedia } from "./create"
import { deleteMediaRoute } from "./delete"
import { listMediaRoute } from "./list"

/** Admin media router: same shape as `contract.admin.media`. */
export const mediaRouter = {
  create: createMedia,
  confirm: confirmMedia,
  list: listMediaRoute,
  delete: deleteMediaRoute,
}
