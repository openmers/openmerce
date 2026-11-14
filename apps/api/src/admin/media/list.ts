import { listMedia } from "@openmers/core"
import { ORPCError } from "@orpc/server"
import { base } from "../../orpc/base"

/** `admin.media.list`: library items, newest first; the cursor is opaque to clients. */
export const listMediaRoute = base.admin.media.list.handler(async ({ input, context }) => {
  const cursor = input.cursor === undefined ? undefined : Number(input.cursor)
  if (cursor !== undefined && !Number.isSafeInteger(cursor)) {
    throw new ORPCError("INVALID_INPUT", { message: "invalid cursor" })
  }
  const page = await listMedia(context.ctx, { cursor, limit: input.limit })
  return {
    items: page.items,
    nextCursor: page.nextCursor === null ? null : String(page.nextCursor),
  }
})
