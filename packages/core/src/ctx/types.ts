import type { Channel } from "../features/channels"
import type { Platform } from "../platform"

/** İstek yüzeyi: Shop (vitrin/mobil) veya Admin (panel/uygulama/betik). */
export type ApiSurface = "shop" | "admin"

export type ActorType = "anonymous" | "customer" | "admin" | "app" | "apiKey"

/** Aktör: iç kimlik (varsa) ve izin kümesi; izin modeli `06-guvenlik-ve-yetki`. */
export type CtxActor = {
  type: ActorType
  id?: number
  permissions: ReadonlySet<string>
}

export type CtxCustomer = { id: number; groupIds: number[] }

export type CtxCompanyRole = "admin" | "buyer" | "approver"

export type CtxCompany = { id: number; role: CtxCompanyRole }

/**
 * Her `core` fonksiyonunun ilk parametresi; istek başına bir kez kurulur
 * (`02-api-ve-istek-baglami` §2). `channel` bellektedir, `segment` önbellek anahtarıdır.
 */
export interface Ctx {
  platform: Platform
  api: ApiSurface
  channel: Channel
  lang: string
  currency: string
  customer?: CtxCustomer
  company?: CtxCompany
  /** Öncelik sırasıyla; segment anahtarı bu sıradan bağımsızdır. */
  priceListIds: number[]
  /** Önbellek anahtarı: kanal + dil + para birimi + fiyat listesi kümesi. */
  segment: string
  actor: CtxActor
  now: number
  requestId: string
}

/** Oturum yokken (anonim B2C) aktör: izin yok, kimlik yok. */
export const ANONYMOUS_ACTOR: CtxActor = Object.freeze({
  type: "anonymous",
  permissions: new Set<string>(),
})
