import { atom } from "nanostores"

/** Active channel code; empty means the API resolves the channel from Host. */
export const $channel = atom<string>(import.meta.env.VITE_OPENMERS_CHANNEL ?? "")

/** Same name as the API's `CHANNEL_HEADER`; the client must not import server-side core. */
export function channelHeaders(): Record<string, string> {
  const channel = $channel.get()
  return channel ? { "x-openmers-channel": channel } : {}
}
