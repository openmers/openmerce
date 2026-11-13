import {
  type Channel,
  ChannelError,
  type ChannelSnapshot,
  type ResolvedChannel,
  resolveChannel,
} from "../features/channels"

/** Yayınlanabilir kanal anahtarının taşındığı başlık adı (küçük harf; Hono başlıkları böyle verir). */
export const CHANNEL_HEADER = "x-openmers-channel"

export type ResolveRequestChannelInput = {
  /** Bellekteki kanal tablosu (`createChannelRegistry`); sorgu yok. */
  snapshot: ChannelSnapshot
  /** `Host` başlığı. */
  host?: string | null
  /** `x-openmers-channel`: kanal `code`'u veya `public_id`'si (büyük/küçük harf duyarsız). */
  channelHeader?: string | null
}

/** Başlıktaki anahtar → kanal. Boş anahtar `undefined` (Host'a düşülür). */
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
 * `x-openmers-channel` varsa Host'tan önce gelir: istemci kanalını açıkça seçer (mobil).
 * Başlık yalnız kanalı seçer, alan adı yönlendirmesi üretmez. Bilinmeyen başlık
 * `INVALID_CHANNEL`, bilinmeyen Host `UNKNOWN_DOMAIN` (varsayılana düşülmez).
 * Kanal mantığı `features/channels` içindedir; burada kopyalanmaz.
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
