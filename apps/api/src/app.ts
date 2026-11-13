import {
  CHANNEL_HEADER,
  type ChannelRegistry,
  type ChannelSnapshot,
  type PaymentHandler,
  type Platform,
  resolveRequestChannel,
} from "@openmers/core"
import type { Context } from "hono"
import { Hono } from "hono"
import { createAdminAuth } from "./auth/adminAuth"
import { createCartSigner } from "./auth/cartToken"
import { createCustomerAuth } from "./auth/customerAuth"
import { type CommerceConfigSource, createCommerceConfig } from "./commerce/config"
import { paymentWebhook } from "./hooks/payments/[method]"
import type { AppEnv } from "./http/env"
import { apiError } from "./http/errors"
import { isHttps, type SecureOptions, secureResponse } from "./http/secure"
import { csrfOrigin } from "./middleware/csrfOrigin"
import { rateLimit } from "./middleware/rateLimit"
import type { ApiInitialContext } from "./orpc/base"
import { openApiDocument, openApiHandler, rpcHandler } from "./orpc/handlers"

export type AppOptions = SecureOptions & {
  platform: Platform
  /** In-memory channel table (`createChannelRegistry`): no query per request. */
  channels: Pick<ChannelRegistry, "get">
  now?: () => number
  requestId?: () => string
  /** Session signing secret (Better Auth `secret`), at least 32 characters; the customer key is derived from it. */
  authSecret: string
  /** Rate limiter and webhook error log; defaults to `console.error`. */
  log?: (message: string, error: unknown) => void
  /** Payment handlers by `handler_code`, added to the built-in manual ones. */
  paymentHandlers?: Readonly<Record<string, PaymentHandler>>
  /** Shared commerce configuration (the worker uses the same one); built from the platform if omitted. */
  commerce?: CommerceConfigSource
}

/** `Host`: a header on a real server, taken from the URL in `app.request` tests. */
function hostOf(c: { req: { header(name: string): string | undefined; url: string } }): string {
  return c.req.header("host") ?? new URL(c.req.url).host
}

function redirectUrl(requestUrl: string, to: string, https: boolean): string {
  const url = new URL(requestUrl)
  url.host = to
  url.protocol = https ? "https:" : url.protocol
  return url.toString()
}

/** Unknown domain/key throws `ChannelError`; mapped to 404 in the API (no fallback to default). */
function resolveOrNull(input: {
  snapshot: ChannelSnapshot
  host: string
  channelHeader: string | null
}): ReturnType<typeof resolveRequestChannel> | null {
  try {
    return resolveRequestChannel(input)
  } catch {
    return null
  }
}

/**
 * Hono shell (`02-api-ve-istek-baglami` §6, §8): security headers outermost, then CSRF `Origin`,
 * channel resolution and rate limiting; `/api/*` goes to OpenAPI, `/rpc/*` to the RPC handler. Hono is
 * only the routing shell; the `hc` client is not used.
 */
export function createApp(opts: AppOptions): Hono<AppEnv> {
  const app = new Hono<AppEnv>()
  const secure = (c: Context<AppEnv>, res: Response) => secureResponse(c, res, opts)
  const adminAuth = createAdminAuth({ db: opts.platform.db, secret: opts.authSecret })
  const customerAuth = createCustomerAuth({
    platform: opts.platform,
    secret: opts.authSecret,
    now: opts.now,
  })
  const commerce =
    opts.commerce ??
    createCommerceConfig({ platform: opts.platform, handlers: opts.paymentHandlers })
  const cartSigner = createCartSigner(opts.authSecret)

  // 1) Outermost middleware: request id + security headers (including errors/404).
  app.use("*", async (c, next) => {
    c.set("requestId", opts.requestId?.() ?? crypto.randomUUID())
    await next()
    secure(c, c.res)
  })

  // 2) CSRF: form-typed, state-changing requests must have a matching `Origin`.
  app.use("*", csrfOrigin())

  // 3) Channel: `x-openmers-channel` takes precedence over Host; unknown domain/key 404.
  app.use("*", async (c, next) => {
    const now = opts.now?.() ?? Date.now()
    const snapshot: ChannelSnapshot = await opts.channels.get(now)
    const host = hostOf(c)
    const channelHeader = c.req.header(CHANNEL_HEADER) ?? null
    const resolved = resolveOrNull({ snapshot, host, channelHeader })
    if (!resolved) return apiError(c, 404, "CHANNEL_UNKNOWN")
    if (resolved.kind === "redirect") {
      return c.redirect(redirectUrl(c.req.url, resolved.to, isHttps(c, opts.https)), 301)
    }
    const context: ApiInitialContext = {
      platform: opts.platform,
      snapshot,
      api: "shop",
      host,
      channelHeader,
      now,
      requestId: c.get("requestId"),
      adminAuth,
      customerAuth,
      reqHeaders: c.req.raw.headers,
      https: isHttps(c, opts.https),
      commerce,
      cartSigner,
    }
    c.set("apiContext", context)
    c.set("channel", resolved.channel.code)
    await next()
  })

  // 4) Rate limit: bucket = channel + route group + client; passes if the limiter crashes.
  app.use("*", rateLimit({ platform: opts.platform, log: opts.log }))

  app.post(
    "/hooks/payments/:method",
    paymentWebhook({ platform: opts.platform, commerce, now: opts.now, log: opts.log }),
  )

  app.all("/api/openapi.json", async (c) => c.json(await openApiDocument()))

  app.all("/api/*", async (c) => {
    const { matched, response } = await openApiHandler.handle(c.req.raw, {
      prefix: "/api",
      context: c.get("apiContext"),
    })
    return matched ? response : apiError(c, 404, "NOT_FOUND")
  })

  app.all("/rpc/*", async (c) => {
    const { matched, response } = await rpcHandler.handle(c.req.raw, {
      prefix: "/rpc",
      context: c.get("apiContext"),
    })
    return matched ? response : apiError(c, 404, "NOT_FOUND")
  })

  // Error and 404 responses also carry security headers; internal messages are not leaked.
  app.notFound((c) => secure(c, apiError(c, 404, "NOT_FOUND")))
  app.onError((_error, c) => secure(c, apiError(c, 500, "INTERNAL")))

  return app
}
