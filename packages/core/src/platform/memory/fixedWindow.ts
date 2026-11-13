import type { RateLimitResult } from "../ports/rateLimit"
import { createLru } from "./lru"

// Pure in-memory fixed window counter (self-host `rateLimit`). Clock is injected (`now`, epoch ms).
export type FixedWindow = { hit(key: string, now: number): RateLimitResult }

type Window = { start: number; count: number }

/** `limit` requests per window. Keys are kept in an LRU; if `maxKeys` is exceeded the oldest is reset. */
export function createFixedWindow(opts: {
  limit: number
  windowMs: number
  maxKeys?: number
}): FixedWindow {
  const windows = createLru<Window>({ max: opts.maxKeys ?? 10_000, ttlMs: opts.windowMs })
  return {
    hit(key, now) {
      let w = windows.get(key, now)
      if (!w || now - w.start >= opts.windowMs) {
        w = { start: now, count: 0 }
        windows.set(key, w, now)
      }
      w.count++
      if (w.count <= opts.limit) return { ok: true }
      return { ok: false, retryAfter: Math.ceil((w.start + opts.windowMs - now) / 1000) }
    },
  }
}
