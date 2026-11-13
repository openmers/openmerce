// Data cache (session, hot configuration): Cloudflare KV + request-scoped memory, self-host in-memory LRU.
// The cache is not a source of truth; a miss always falls through to the database.
export type Cache = {
  /** `undefined` if missing or expired. */
  get<T>(key: string): Promise<T | undefined>
  /** Adapter default if `ttlSeconds` is missing. The value must be JSON-serializable (KV). */
  set<T>(key: string, value: T, opts?: { ttlSeconds?: number }): Promise<void>
  delete(key: string): Promise<void>
}
