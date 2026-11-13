// Pure, runtime-independent LRU: size limit + TTL. Clock is injected (`now`, epoch ms).
// Used by the self-host `cache` and the request-scoped cache.
export type Lru<V> = {
  /** `undefined` if missing or expired; becomes the newest when found. */
  get(key: string, now: number): V | undefined
  /** Default if `ttlMs` is missing; no expiry if that is missing too. The oldest is evicted when over the limit. */
  set(key: string, value: V, now: number, ttlMs?: number): void
  delete(key: string): boolean
  readonly size: number
}

type Entry<V> = { value: V; expiresAt: number }

export function createLru<V>(opts: { max: number; ttlMs?: number }): Lru<V> {
  if (!(opts.max >= 1)) throw new RangeError("max en az 1 olmalı")
  // Map keeps insertion order: the first key is the oldest.
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
