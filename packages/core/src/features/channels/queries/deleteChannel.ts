import { channelDomains, channels } from "@openmers/db"
import { and, eq, inArray } from "drizzle-orm"
import type { Platform } from "../../../platform"
import { assertChannelDeletable } from "../defaultChannel"
import type { ChannelRow } from "../types"

/**
 * Deletes a non-default channel together with its domains in one `atomic()`. Returns the number of deleted
 * channels (0/1). The `is_default = 0` condition is in SQL too: if the in-memory copy is stale the default is protected.
 */
export async function deleteChannel(
  p: Pick<Platform, "db" | "atomic">,
  channel: Pick<ChannelRow, "id" | "isDefault" | "code">,
): Promise<number> {
  assertChannelDeletable(channel)
  // shortcut: no order/cart check, those tables come in phase 2; once added, a NOT EXISTS goes into this condition.
  const deletable = p.db
    .select({ id: channels.id })
    .from(channels)
    .where(and(eq(channels.id, channel.id), eq(channels.isDefault, false)))
  const [, n = 0] = await p.atomic([
    p.db.delete(channelDomains).where(inArray(channelDomains.channelId, deletable)).toSQL(),
    p.db
      .delete(channels)
      .where(and(eq(channels.id, channel.id), eq(channels.isDefault, false)))
      .toSQL(),
  ])
  return n
}
