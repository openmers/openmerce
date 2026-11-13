import {
  CHANNEL_HEADER,
  type ChannelRegistry,
  type ChannelSnapshot,
  type Platform,
  resolveRequestChannel,
} from "@openmers/core"
import type { Context } from "hono"
import { Hono } from "hono"
import type { AppEnv } from "./http/env"
import { apiError } from "./http/errors"
import { isHttps, type SecureOptions, secureResponse } from "./http/secure"
import type { ApiInitialContext } from "./orpc/base"
import { openApiDocument, openApiHandler, rpcHandler } from "./orpc/handlers"

export type AppOptions = SecureOptions & {
  platform: Platform
  /** Bellekteki kanal tablosu (`createChannelRegistry`): istek başına sorgu yok. */
  channels: Pick<ChannelRegistry, "get">
  now?: () => number
  requestId?: () => string
}

/** `Host`: gerçek sunucuda başlık, `app.request` testinde URL'den gelir. */
function hostOf(c: { req: { header(name: string): string | undefined; url: string } }): string {
  return c.req.header("host") ?? new URL(c.req.url).host
}

function redirectUrl(requestUrl: string, to: string, https: boolean): string {
  const url = new URL(requestUrl)
  url.host = to
  url.protocol = https ? "https:" : url.protocol
  return url.toString()
}

/** Bilinmeyen alan adı/anahtar `ChannelError` fırlatır; API'de 404'e eşlenir (varsayılana düşülmez). */
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
 * Hono kabuğu (`02-api-ve-istek-baglami` §6, §8): güvenlik başlıkları en dışta, kanal çözümleme
 * ikinci sırada; `/api/*` OpenAPI, `/rpc/*` RPC işleyicisine devredilir. Hono yalnız yönlendirme
 * kabuğudur, `hc` istemcisi kullanılmaz.
 */
export function createApp(opts: AppOptions): Hono<AppEnv> {
  const app = new Hono<AppEnv>()
  const secure = (c: Context<AppEnv>, res: Response) => secureResponse(c, res, opts)

  // 1) En dış ara katman: istek kimliği + güvenlik başlıkları (hata/404 dahil).
  app.use("*", async (c, next) => {
    c.set("requestId", opts.requestId?.() ?? crypto.randomUUID())
    await next()
    secure(c, c.res)
  })

  // 2) Kanal: `x-openmers-channel` Host'tan önce gelir; bilinmeyen alan adı/anahtar 404.
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
    }
    c.set("apiContext", context)
    await next()
  })

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

  // Hata ve 404 yanıtları da güvenlik başlıklarını taşır; iç ileti sızdırılmaz.
  app.notFound((c) => secure(c, apiError(c, 404, "NOT_FOUND")))
  app.onError((_error, c) => secure(c, apiError(c, 500, "INTERNAL")))

  return app
}
