import { contract } from "@openmers/contract"
import {
  type ApiSurface,
  buildCtx,
  ChannelError,
  type ChannelSnapshot,
  type Ctx,
  type Platform,
} from "@openmers/core"
import { implement, ORPCError } from "@orpc/server"

/**
 * oRPC kökü (`02-api-ve-istek-baglami` §6). `Ctx` kuran ara katman **yalnız burada** eklenir
 * (`ctxLoaded` bayrağı); prosedürler yalnızca izin ara katmanı ekler, böylece ara katman istek
 * başına bir kez çalışır.
 */
export type ApiInitialContext = {
  platform: Platform
  /** Bellekteki kanal tablosu; anonim yolda sorgu yok. */
  snapshot: ChannelSnapshot
  api: ApiSurface
  host: string | null
  channelHeader: string | null
  now: number
  requestId: string
}

export type ApiContext = ApiInitialContext & { ctx: Ctx; ctxLoaded: true }

/** Beklenen hata kodu → HTTP durumu; hem işleyicilere hem OpenAPI üreticisine verilir. */
export const errorStatusMap: Record<string, number> = {
  INVALID_INPUT: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CHANNEL_UNKNOWN: 404,
  CONFLICT: 409,
  IDEMPOTENCY_MISMATCH: 409,
  INSUFFICIENT_STOCK: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
}

function channelErrorToOrpc(): ORPCError<"CHANNEL_UNKNOWN", undefined> {
  return new ORPCError("CHANNEL_UNKNOWN", { message: "kanal çözümlenemedi" })
}

function buildRequestCtx(context: ApiInitialContext): Ctx {
  let built: ReturnType<typeof buildCtx>
  try {
    built = buildCtx({
      platform: context.platform,
      api: context.api,
      snapshot: context.snapshot,
      host: context.host,
      channelHeader: context.channelHeader,
      now: context.now,
      requestId: context.requestId,
    })
  } catch (error) {
    if (error instanceof ChannelError) throw channelErrorToOrpc()
    throw error
  }
  if (built.kind === "redirect") {
    // Yönlendirme Hono katmanında yapılır; buraya düşmesi kanal tablosunun tutarsızlığıdır.
    throw new ORPCError("CHANNEL_UNKNOWN", { message: "kanal yönlendirmesi" })
  }
  return built.ctx
}

export const base = implement(contract)
  .$context<ApiInitialContext>()
  .use(async ({ context, next }) => {
    // Ctx yalnız kökte kurulur; `ctxLoaded` bu işin yapıldığını işaretler (ara katman bir kez çalışır).
    return next({ context: { ctx: buildRequestCtx(context), ctxLoaded: true as const } })
  })
