// Saf, çalışma zamanından bağımsız LRU: boyut sınırı + TTL. Saat dışarıdan (`now`, epoch ms) gelir.
// Self-host `cache` ve istek ömürlü önbellek bunu kullanır.
export type Lru<V> = {
  /** Yoksa ya da süresi dolduysa `undefined`; bulunursa en yeni olur. */
  get(key: string, now: number): V | undefined
  /** `ttlMs` yoksa varsayılan; o da yoksa süresiz. Sınır aşılırsa en eski çıkar. */
  set(key: string, value: V, now: number, ttlMs?: number): void
  delete(key: string): boolean
  readonly size: number
}

type Entry<V> = { value: V; expiresAt: number }

export function createLru<V>(opts: { max: number; ttlMs?: number }): Lru<V> {
  if (!(opts.max >= 1)) throw new RangeError("max en az 1 olmalı")
  // Map ekleme sırasını korur: ilk anahtar en eskisi.
  const map = new Map<string, Entry<V>>()
  return {
    get(key, now) {
      const e = map.get(key)
      if (!e) return undefined
      map.delete(key)
      if (e.expiresAt <= now) return undefined
      map.set(key, e)
      return e.value
    },
    set(key, value, now, ttlMs = opts.ttlMs) {
      map.delete(key)
      map.set(key, { value, expiresAt: ttlMs === undefined ? Infinity : now + ttlMs })
      if (map.size > opts.max) map.delete(map.keys().next().value as string)
    },
    delete: (key) => map.delete(key),
    get size() {
      return map.size
    },
  }
}
