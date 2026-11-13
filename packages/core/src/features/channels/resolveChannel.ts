import { type Channel, type ChannelDomain, ChannelError } from "./types"

export type DomainIndex = ReadonlyMap<string, { channel: Channel; domain: ChannelDomain }>

export type ResolvedChannel =
  | { kind: "serve"; channel: Channel; lang: string }
  /** Secondary domain `redirect`: 301 to the primary domain. */
  | { kind: "redirect"; channel: Channel; to: string }

/** Domain → channel; the in-memory table is built once (channelRegistry). */
export function indexDomains(channels: readonly Channel[]): DomainIndex {
  const index = new Map<string, { channel: Channel; domain: ChannelDomain }>()
  for (const channel of channels) {
    for (const domain of channel.domains) index.set(domain.domain, { channel, domain })
  }
  return index
}

/** Normalizes the `Host` header to lowercase, without port and trailing dot. */
export function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.+$/, "").replace(/:\d+$/, "").replace(/\.+$/, "")
}

/** `Host` → channel + language. An unknown domain does not fall back to the default channel: `UNKNOWN_DOMAIN` (404). */
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
