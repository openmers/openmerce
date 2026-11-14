import { contract } from "@openmers/contract"
import {
  type ApiSurface,
  buildCtx,
  ChannelError,
  type ChannelSnapshot,
  type Ctx,
  type CustomerActor,
  type Platform,
} from "@openmers/core"
import { implement, ORPCError } from "@orpc/server"
import type { ResponseHeadersHandlerPluginContext } from "@orpc/server/plugins"
import type { AdminAuth } from "../auth/adminAuth"
import type { CartSigner } from "../auth/cartToken"
import type { CustomerAuth } from "../auth/customerAuth"
import type { CommerceConfigSource } from "../commerce/config"
import { loadShopCustomer } from "./customerSession"
import { type AdminGuardResult, requirePermission } from "./requirePermission"

/**
 * oRPC root (`02-api-ve-istek-baglami` §6). The middleware that builds `Ctx` is added **only here**
 * (`ctxLoaded` flag); procedures only add the permission middleware, so the middleware runs once
 * per request.
 */
export type ApiInitialContext = {
  platform: Platform
  /** In-memory channel table; no query on the anonymous path. */
  snapshot: ChannelSnapshot
  api: ApiSurface
  host: string | null
  channelHeader: string | null
  now: number
  requestId: string
  /** Better Auth admin instance (built once per app). */
  adminAuth: AdminAuth
  /** Better Auth customer instance (`om_s`), built once per app. */
  customerAuth: CustomerAuth
  reqHeaders: Headers
  /** Whether the request is HTTPS; `Secure` is added to the session cookie accordingly. */
  https: boolean
  /** Promotions, shipping, tax, payment methods in memory (cart and checkout). */
  commerce: CommerceConfigSource
  /** Signs/verifies the guest cart cookie (`om_c`). */
  cartSigner: CartSigner
} & ResponseHeadersHandlerPluginContext

export type ApiContext = ApiInitialContext & {
  ctx: Ctx
  ctxLoaded: true
  /** Set only in session-authenticated Admin procedures. */
  admin?: AdminGuardResult["admin"]
  /** Set on the Shop surface when a valid `om_s` session exists. */
  customer?: CustomerActor
}

/** Expected error code → HTTP status; given to both the handlers and the OpenAPI generator. */
export const errorStatusMap: Record<string, number> = {
  INVALID_INPUT: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CHANNEL_UNKNOWN: 404,
  CONFLICT: 409,
  LIMIT_EXCEEDED: 409,
  SETUP_REQUIRED: 403,
  SETUP_DONE: 409,
  IDEMPOTENCY_MISMATCH: 409,
  INSUFFICIENT_STOCK: 409,
  CART_CHANGED: 409,
  COUPON_EXHAUSTED: 409,
  INVALID_TRANSITION: 409,
  REFUND_EXCEEDS: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
}

function channelErrorToOrpc(): ORPCError<"CHANNEL_UNKNOWN", undefined> {
  return new ORPCError("CHANNEL_UNKNOWN", { message: "kanal çözümlenemedi" })
}

function buildRequestCtx(context: ApiInitialContext, customer?: CustomerActor | null): Ctx {
  let built: ReturnType<typeof buildCtx>
  try {
    built = buildCtx({
      ...(customer
        ? {
            customer: { id: customer.id, groupIds: customer.groupIds },
            priceListIds: customer.priceListIds,
            actor: { type: "customer" as const, id: customer.id, permissions: new Set<string>() },
          }
        : {}),
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
    // Routing happens in the Hono layer; reaching here means the channel table is inconsistent.
    throw new ORPCError("CHANNEL_UNKNOWN", { message: "kanal yönlendirmesi" })
  }
  return built.ctx
}

/** Shop resources that are per-person (cookie/session bound): never cached. */
const PRIVATE_SHOP = new Set(["account", "cart", "checkout", "orders", "uploads"])

export const base = implement(contract)
  .$context<ApiInitialContext>()
  .use(async ({ context, next, path, procedure }) => {
    // Ctx is only built at the root; `ctxLoaded` marks that this was done (the middleware runs once).
    // On the Admin surface the setup gate + session + permission are checked here too, in the same single pass.
    // The surface comes from the router path (not from the URL).
    const isAdmin = path[0] === "admin"
    if (!isAdmin) {
      // Personal pages are never cached (11-musteriler §9), errors included.
      if (PRIVATE_SHOP.has(String(path[1]))) context.resHeaders?.set("cache-control", "no-store")
      const customer = await loadShopCustomer(context)
      const ctx = buildRequestCtx({ ...context, api: "shop" }, customer)
      return next({
        context: {
          ctx,
          ctxLoaded: true as const,
          admin: undefined as AdminGuardResult["admin"],
          customer: customer ?? undefined,
        },
      })
    }
    const ctx = buildRequestCtx({ ...context, api: "admin" })
    const guard = await requirePermission({ context, ctx, path, procedure })
    return next({
      context: {
        ctx: { ...ctx, actor: guard.actor },
        ctxLoaded: true as const,
        admin: guard.admin,
        customer: undefined as CustomerActor | undefined,
      },
    })
  })
