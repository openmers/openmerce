import { type DomainIndex, indexDomains } from "../resolveChannel"
import type { Channel } from "../types"

export type ChannelSnapshot = { channels: Channel[]; byDomain: DomainIndex; version: number }

export type ChannelRegistry = {
  /** Bellekteki tablo; `checkEveryMs` dolduysa sürümü okur, değiştiyse yeniden yükler. */
  get(now: number): Promise<ChannelSnapshot>
}

/**
 * Kanal + alan adı tablosu bellekte (05-ticaret/01-kanallar §6). `load` tek tur (`loadChannels`),
 * `version` ucuz nokta okuma (ör. kanalların `settings_version` toplamı). Saat dışarıdan; LRU yok.
 * Varsayılan `checkEveryMs = 0`: her çağrıda sürüm okunur, değiştiyse yeniden yüklenir.
 */
export function createChannelRegistry(opts: {
  load: () => Promise<Channel[]>
  version: () => Promise<number>
  /** Sürüm okumasını bu aralıkta bir yap (05-onbellek: 30 sn). 0 = her çağrıda. */
  checkEveryMs?: number
}): ChannelRegistry {
  const checkEveryMs = opts.checkEveryMs ?? 0
  let snapshot: ChannelSnapshot | undefined
  let checkedAt = 0
  let pending: Promise<ChannelSnapshot> | undefined

  async function refresh(now: number): Promise<ChannelSnapshot> {
    const version = await opts.version()
    checkedAt = now
    if (snapshot && snapshot.version === version) return snapshot
    const channels = await opts.load()
    snapshot = { channels, byDomain: indexDomains(channels), version }
    return snapshot
  }

  return {
    get(now) {
      if (snapshot && now - checkedAt < checkEveryMs) return Promise.resolve(snapshot)
      // eşzamanlı istekler aynı yenilemeyi bekler
      pending ??= refresh(now).finally(() => {
        pending = undefined
      })
      return pending
    },
  }
}
