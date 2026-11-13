import type { TaxConfig } from "../types"

export type TaxSnapshot = TaxConfig & { version: number }

export type TaxRegistry = {
  /** In-memory table; reads the version once `checkEveryMs` has elapsed and reloads if it changed. */
  get(now: number): Promise<TaxSnapshot>
}

/**
 * Tax table in memory (09-vergi §1), same pattern as the channel registry: `load` is one round trip
 * (`loadTaxConfig`), `version` is a cheap point read (e.g. `settings.version`). Clock is injected.
 * Default `checkEveryMs = 0`: the version is read on every call and reloaded if it changed.
 */
export function createTaxRegistry(opts: {
  load: () => Promise<TaxConfig>
  version: () => Promise<number>
  checkEveryMs?: number
}): TaxRegistry {
  const checkEveryMs = opts.checkEveryMs ?? 0
  let snapshot: TaxSnapshot | undefined
  let checkedAt = 0
  let pending: Promise<TaxSnapshot> | undefined

  async function refresh(now: number): Promise<TaxSnapshot> {
    const version = await opts.version()
    checkedAt = now
    if (snapshot && snapshot.version === version) return snapshot
    snapshot = { ...(await opts.load()), version }
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
