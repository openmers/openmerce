// Veri önbelleği (oturum, sıcak yapılandırma): Cloudflare KV + istek ömürlü bellek, self-host bellek içi LRU.
// Önbellek doğruluk kaynağı değildir; ıska her zaman veritabanına düşer.
export type Cache = {
  /** Yoksa ya da süresi dolduysa `undefined`. */
  get<T>(key: string): Promise<T | undefined>
  /** `ttlSeconds` yoksa adaptörün varsayılanı. Değer JSON'a çevrilebilir olmalı (KV). */
  set<T>(key: string, value: T, opts?: { ttlSeconds?: number }): Promise<void>
  delete(key: string): Promise<void>
}
