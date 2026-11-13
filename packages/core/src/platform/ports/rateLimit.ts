// İstek sınırlama: Cloudflare Rate Limiting binding, self-host bellek içi sabit pencere.
export type RateLimitResult = {
  ok: boolean
  /** `ok: false` ise yeniden denemeye kadar saniye (HTTP `Retry-After`). */
  retryAfter?: number
}

/**
 * Fail-open sözleşmesi (06-güvenlik): sınırlayıcı çökerse ya da binding yoksa adaptör hata fırlatmaz,
 * `{ ok: true }` döner; istek geçer. Hız sınırı koruma katmanıdır, doğruluk koşulu değildir.
 */
export type RateLimit = (key: string) => Promise<RateLimitResult>
