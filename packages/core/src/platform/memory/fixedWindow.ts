import type { RateLimitResult } from "../ports/rateLimit"
import { createLru } from "./lru"

// Saf bellek içi sabit pencere sayacı (self-host `rateLimit`). Saat dışarıdan (`now`, epoch ms).
export type FixedWindow = { hit(key: string, now: number): RateLimitResult }

type Window = { start: number; count: number }

/** Pencere başına `limit` istek. Anahtarlar LRU'da tutulur; `maxKeys` aşılırsa en eskisi sıfırlanır. */
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
