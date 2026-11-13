import { CheckoutError, handleWebhook, PaymentError, type Platform } from "@openmers/core"
import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { CommerceConfigSource } from "../../commerce/config"
import type { AppEnv } from "../../http/env"
import { apiError } from "../../http/errors"

export type WebhookRouteOptions = {
  platform: Platform
  commerce: CommerceConfigSource
  now?: () => number
  log?: (message: string, error: unknown) => void
}

type Answer = [ContentfulStatusCode, "INVALID_INPUT" | "CONFLICT" | "NOT_FOUND" | "INTERNAL"]

/**
 * Expected outcomes → status. Retryable (event before its payment, unknown kind) and an unknown
 * reservation answer 5xx so the provider delivers again (06 §3); a bad signature or a conflicting
 * event is final (4xx). The body is always the generic code + `requestId`.
 */
function answer(error: unknown): Answer | null {
  if (error instanceof PaymentError) {
    if (error.retryable) return [503, "INTERNAL"]
    if (error.code === "INVALID_SIGNATURE" || error.code === "INVALID_INPUT") {
      return [400, "INVALID_INPUT"]
    }
    if (error.code === "NOT_FOUND") return [404, "NOT_FOUND"]
    return [409, "CONFLICT"]
  }
  if (error instanceof CheckoutError) {
    return error.code === "NOT_FOUND" ? [503, "INTERNAL"] : [409, "CONFLICT"]
  }
  return null
}

/**
 * `POST /hooks/payments/:method`, the single webhook route (22.9): it never knows the provider;
 * the method's handler verifies and normalizes. CSRF and rate limiting skip `/hooks/` (the
 * signature is the check). An unknown or disabled method is 404; internal errors never leak.
 */
export function paymentWebhook(opts: WebhookRouteOptions) {
  const log = opts.log ?? ((m, e) => console.error(m, e))
  return async (c: Context<AppEnv>): Promise<Response> => {
    const now = opts.now?.() ?? Date.now()
    const config = await opts.commerce.get(now)
    const method = config.payments.byCode(c.req.param("method") ?? "")
    if (!method) return apiError(c, 404, "NOT_FOUND")
    const body = await c.req.text()
    try {
      await handleWebhook(
        { platform: opts.platform, now },
        { method, request: { body, headers: c.req.raw.headers } },
      )
      return c.json({ ok: true })
    } catch (error) {
      const known = answer(error)
      log(`payment webhook ${method.code} failed`, error)
      return known ? apiError(c, known[0], known[1]) : apiError(c, 500, "INTERNAL")
    }
  }
}
