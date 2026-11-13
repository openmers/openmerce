import { type Channel, type ChannelDomain, ChannelError } from "./types"

export type DomainIndex = ReadonlyMap<string, { channel: Channel; domain: ChannelDomain }>

export type ResolvedChannel =
  | { kind: "serve"; channel: Channel; lang: string }
  /** İkincil alan adı `redirect`: birincil alan adına 301. */
  | { kind: "redirect"; channel: Channel; to: string }

/** Alan adı → kanal; bellek içi tablo bir kez kurulur (channelRegistry). */
export function indexDomains(channels: readonly Channel[]): DomainIndex {
  const index = new Map<string, { channel: Channel; domain: ChannelDomain }>()
  for (const channel of channels) {
    for (const domain of channel.domains) index.set(domain.domain, { channel, domain })
  }
  return index
}

/** `Host` başlığını küçük harf, portsuz, sonda noktasız biçime getirir. */
export function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.+$/, "").replace(/:\d+$/, "").replace(/\.+$/, "")
}

/** `Host` → kanal + dil. Bilinmeyen alan adı varsayılan kanala düşmez: `UNKNOWN_DOMAIN` (404). */
export function resolveChannel(host: string, index: DomainIndex): ResolvedChannel {
  const name = normalizeHost(host)
  const hit = index.get(name)
  if (!hit) throw new ChannelError("UNKNOWN_DOMAIN", `bilinmeyen alan adı: ${name}`)
  const { channel, domain } = hit
  if (domain.secondaryMode === "redirect") {
    const primary = channel.domains.find((d) => d.isPrimary)
    if (primary) return { kind: "redirect", channel, to: primary.domain }
  }
  return { kind: "serve", channel, lang: domain.defaultLang ?? channel.defaultLang }
}
