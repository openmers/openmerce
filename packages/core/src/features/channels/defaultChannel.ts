import { ChannelError, type ChannelRow } from "./types"

/** The default channel cannot be deleted (05-ticaret/01-kanallar). SQL also guards it with `is_default = 0`. */
export function assertChannelDeletable(channel: Pick<ChannelRow, "isDefault" | "code">): void {
  if (channel.isDefault) {
    throw new ChannelError("DEFAULT_CHANNEL", `varsayılan kanal silinemez: ${channel.code}`)
  }
}
