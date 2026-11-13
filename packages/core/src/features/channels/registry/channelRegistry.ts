import { type DomainIndex, indexDomains } from "../resolveChannel"
import type { Channel } from "../types"

export type ChannelSnapshot = { channels: Channel[]; byDomain: DomainIndex; version: number }

export type ChannelRegistry = {
  /** In-memory table; reads the version once `checkEveryMs` has elapsed and reloads if it changed. */
  get(now: number): Promise<ChannelSnapshot>
}

/**
 * Channel + domain table in memory (05-ticaret/01-kanallar §6). `load` is one round trip (`loadChannels`),
 * `version` is a cheap point read (e.g. the sum of the channels' `settings_version`). Clock is injected; no LRU.
 * Default `checkEveryMs = 0`: the version is read on every call and reloaded if it changed.
 */
export function createChannelRegistry(opts: {
  load: () => Promise<Channel[]>
  version: () => Promise<number>
  /** Read the version at this interval (05-onbellek: 30 s). 0 = on every call. */
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
      // concurrent requests wait for the same refresh
      pending ??= refresh(now).finally(() => {
        pending = undefined
      })
      return pending
    },
  }
}
