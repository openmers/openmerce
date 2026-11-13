import type { TaxConfig } from "../types"

export type TaxSnapshot = TaxConfig & { version: number }

export type TaxRegistry = {
  /** Bellekteki tablo; `checkEveryMs` dolduysa sürümü okur, değiştiyse yeniden yükler. */
  get(now: number): Promise<TaxSnapshot>
}

/**
 * Vergi tablosu bellekte (09-vergi §1), kanal kayıt defteriyle aynı kalıp: `load` tek tur
 * (`loadTaxConfig`), `version` ucuz nokta okuma (ör. `settings.version`). Saat dışarıdan.
 * Varsayılan `checkEveryMs = 0`: her çağrıda sürüm okunur, değiştiyse yeniden yüklenir.
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
      // eşzamanlı istekler aynı yenilemeyi bekler
      pending ??= refresh(now).finally(() => {
        pending = undefined
      })
      return pending
    },
  }
}
