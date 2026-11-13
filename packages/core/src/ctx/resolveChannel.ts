import {
  type Channel,
  ChannelError,
  type ChannelSnapshot,
  type ResolvedChannel,
  resolveChannel,
} from "../features/channels"

/** Header name carrying the publishable channel key (lowercase; Hono gives headers this way). */
export const CHANNEL_HEADER = "x-openmers-channel"

export type ResolveRequestChannelInput = {
  /** In-memory channel table (`createChannelRegistry`); no query. */
  snapshot: ChannelSnapshot
  /** The `Host` header. */
  host?: string | null
  /** `x-openmers-channel`: the channel's `code` or `public_id` (case-insensitive). */
  channelHeader?: string | null
}

/** Header key → channel. An empty key is `undefined` (falls back to Host). */
export function channelFromHeader(
  snapshot: ChannelSnapshot,
  header: string | null | undefined,
): Channel | undefined {
  const key = header?.trim().toLowerCase()
  if (!key) return undefined
  return snapshot.channels.find(
    (channel) => channel.code.toLowerCase() === key || channel.publicId.toLowerCase() === key,
  )
}

/**
 * If `x-openmers-channel` is present it takes precedence over Host: the client picks its channel explicitly (mobile).
 * The header only picks the channel and produces no domain redirect. Unknown header
 * `INVALID_CHANNEL`, unknown Host `UNKNOWN_DOMAIN` (no fallback to default).
 * Channel logic lives in `features/channels`; it is not duplicated here.
 */
export function resolveRequestChannel(input: ResolveRequestChannelInput): ResolvedChannel {
  const header = input.channelHeader?.trim()
  if (header) {
    const channel = channelFromHeader(input.snapshot, header)
    if (!channel) throw new ChannelError("INVALID_CHANNEL", `bilinmeyen kanal: ${header}`)
    return { kind: "serve", channel, lang: channel.defaultLang }
  }
  if (!input.host?.trim()) throw new ChannelError("UNKNOWN_DOMAIN", "Host başlığı yok")
  return resolveChannel(input.host, input.snapshot.byDomain)
}
