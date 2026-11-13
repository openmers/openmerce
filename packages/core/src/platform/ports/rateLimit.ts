// Request limiting: Cloudflare Rate Limiting binding, self-host in-memory fixed window.
export type RateLimitResult = {
  ok: boolean
  /** Seconds until retry when `ok: false` (HTTP `Retry-After`). */
  retryAfter?: number
}

/**
 * Fail-open contract (06-guvenlik-ve-yetki): if the limiter crashes or the binding is missing, the adapter does not throw,
 * it returns `{ ok: true }`; the request passes. Rate limiting is a protection layer, not a correctness condition.
 */
export type RateLimit = (key: string) => Promise<RateLimitResult>
