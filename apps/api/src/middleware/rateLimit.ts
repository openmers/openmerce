import type { Platform } from "@openmers/core"
import type { MiddlewareHandler } from "hono"
import type { AppEnv } from "../http/env"
import { apiError } from "../http/errors"
import { WEBHOOK_PREFIX } from "./csrfOrigin"

/** Route groups with separate budgets (`06-guvenlik-ve-yetki`: login, checkout, search); the rest is `api`. */
const GROUPS: readonly [RegExp, string][] = [
  [/\/(auth|login|sign-?in)(\/|$)/i, "login"],
  [/\/checkout(\/|$)/i, "checkout"],
  [/\/search(\/|$)/i, "search"],
]

export function routeGroup(path: string): string {
  return GROUPS.find(([re]) => re.test(path))?.[1] ?? "api"
}

// shortcut: trusts proxy headers (Cloudflare / reverse proxy); on a directly exposed Node server
// a client can spoof the header and change its bucket; narrow this once a trusted proxy list exists.
function clientOf(header: (name: string) => string | undefined): string {
  return (
    header("cf-connecting-ip") ??
    header("x-real-ip") ??
    header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}

export type RateLimitOptions = {
  platform: Pick<Platform, "rateLimit">
  /** Limiter error; defaults to `console.error`. */
  log?: (message: string, error: unknown) => void
}

/**
 * Request limiting: bucket = channel + route group + client; 429 + `Retry-After` when exceeded. If the
 * limiter errors, the request passes and is logged (fail-open). Webhooks are excluded (signed, the provider
 * retries). Mounted after the channel middleware.
 */
export function rateLimit(opts: RateLimitOptions): MiddlewareHandler<AppEnv> {
  const log = opts.log ?? ((m, e) => console.error(m, e))
  return async (c, next) => {
    if (c.req.path.startsWith(WEBHOOK_PREFIX)) return next()
    const key = `${c.get("channel")}:${routeGroup(c.req.path)}:${clientOf((n) => c.req.header(n))}`
    let result: Awaited<ReturnType<Platform["rateLimit"]>>
    try {
      result = await opts.platform.rateLimit(key)
    } catch (error) {
      log("rate limit hatası, istek geçiriliyor", error)
      return next()
    }
    if (result.ok) return next()
    const res = apiError(c, 429, "RATE_LIMITED")
    res.headers.set("Retry-After", String(Math.max(1, Math.ceil(result.retryAfter ?? 60))))
    return res
  }
}
