import type { Channel } from "../features/channels"
import type { Platform } from "../platform"

/** Request surface: Shop (storefront/mobile) or Admin (panel/app/script). */
export type ApiSurface = "shop" | "admin"

export type ActorType = "anonymous" | "customer" | "admin" | "app" | "apiKey"

/** Actor: internal id (if any) and permission set; permission model in `06-guvenlik-ve-yetki`. */
export type CtxActor = {
  type: ActorType
  id?: number
  permissions: ReadonlySet<string>
}

export type CtxCustomer = { id: number; groupIds: number[] }

export type CtxCompanyRole = "admin" | "buyer" | "approver"

export type CtxCompany = { id: number; role: CtxCompanyRole }

/**
 * The first parameter of every `core` function; built once per request
 * (`02-api-ve-istek-baglami` §2). `channel` is in memory, `segment` is the cache key.
 */
export interface Ctx {
  platform: Platform
  api: ApiSurface
  channel: Channel
  lang: string
  currency: string
  customer?: CtxCustomer
  company?: CtxCompany
  /** In priority order; the segment key does not depend on this order. */
  priceListIds: number[]
  /** Cache key: channel + language + currency + price list set. */
  segment: string
  actor: CtxActor
  now: number
  requestId: string
}

/** Actor without a session (anonymous B2C): no permissions, no id. */
export const ANONYMOUS_ACTOR: CtxActor = Object.freeze({
  type: "anonymous",
  permissions: new Set<string>(),
})
