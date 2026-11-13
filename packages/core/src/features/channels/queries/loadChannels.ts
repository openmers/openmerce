import { channelDomains, channels } from "@openmers/db"
import { getTableColumns, type Table } from "drizzle-orm"
import type { Platform } from "../../../platform"
import type { Channel, ChannelDomain, ChannelRow } from "../types"

// `batch` ham satır döner (snake_case, JSON metin, 0/1); Drizzle'ın sütun eşlemesiyle tipe çevrilir.
export function mapRow<T extends Table>(table: T, row: Record<string, unknown>): T["$inferSelect"] {
  const out: Record<string, unknown> = {}
  for (const [prop, col] of Object.entries(getTableColumns(table))) {
    const raw = row[col.name]
    out[prop] = raw === null || raw === undefined ? null : col.mapFromDriverValue(raw)
  }
  return out as T["$inferSelect"]
}

/** Bütün kanallar + alan adları, `batch` ile tek tur. */
export async function loadChannels(p: Pick<Platform, "db" | "batch">): Promise<Channel[]> {
  const [channelRows = [], domainRows = []] = await p.batch([
    p.db.select().from(channels).orderBy(channels.id).toSQL(),
    p.db.select().from(channelDomains).orderBy(channelDomains.id).toSQL(),
  ])
  const byId = new Map<number, Channel>()
  for (const row of channelRows) {
    const ch = mapRow(channels, row) as ChannelRow
    byId.set(ch.id, { ...ch, domains: [] })
  }
  for (const row of domainRows) {
    const d = mapRow(channelDomains, row) as ChannelDomain
    byId.get(d.channelId)?.domains.push(d)
  }
  return [...byId.values()]
}
