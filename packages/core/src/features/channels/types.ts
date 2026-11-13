import type { channelDomains, channels } from "@openmers/db"

export type ChannelRow = typeof channels.$inferSelect
export type ChannelDomain = typeof channelDomains.$inferSelect
export type Channel = ChannelRow & { domains: ChannelDomain[] }

export type ChannelErrorCode = "UNKNOWN_DOMAIN" | "DEFAULT_CHANNEL" | "INVALID_CHANNEL"

export class ChannelError extends Error {
  constructor(
    readonly code: ChannelErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "ChannelError"
  }
}
