import { ChannelError, type ChannelRow } from "./types"

/** Varsayılan kanal silinemez (05-ticaret/01-kanallar). SQL de `is_default = 0` ile korur. */
export function assertChannelDeletable(channel: Pick<ChannelRow, "isDefault" | "code">): void {
  if (channel.isDefault) {
    throw new ChannelError("DEFAULT_CHANNEL", `varsayılan kanal silinemez: ${channel.code}`)
  }
}
