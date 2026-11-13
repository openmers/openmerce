import { channelDomains, channels } from "@openmers/db"
import { and, eq, inArray } from "drizzle-orm"
import type { Platform } from "../../../platform"
import { assertChannelDeletable } from "../defaultChannel"
import type { ChannelRow } from "../types"

/**
 * Varsayılan olmayan kanalı alan adlarıyla birlikte tek `atomic()`'te siler. Dönüş silinen kanal
 * sayısı (0/1). `is_default = 0` koşulu SQL'de de var: bellekteki kopya eskiyse varsayılan korunur.
 */
export async function deleteChannel(
  p: Pick<Platform, "db" | "atomic">,
  channel: Pick<ChannelRow, "id" | "isDefault" | "code">,
): Promise<number> {
  assertChannelDeletable(channel)
  // shortcut: sipariş/sepet denetimi yok, tablolar aşama 2'de; eklenince bu koşula NOT EXISTS girer.
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
