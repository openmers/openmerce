import type { ChannelSnapshot } from "../features/channels"
import type { Platform } from "../platform"
import { resolveRequestChannel } from "./resolveChannel"
import { segmentKey } from "./segment"
import {
  ANONYMOUS_ACTOR,
  type ApiSurface,
  type Ctx,
  type CtxActor,
  type CtxCompany,
  type CtxCustomer,
} from "./types"

export type BuildCtxInput = {
  platform: Platform
  api: ApiSurface
  /** Bellekteki kanal tablosu; anonim yolda veritabanına inilmez. */
  snapshot: ChannelSnapshot
  host?: string | null
  channelHeader?: string | null
  /** İstenen dil/para birimi; kanalda yoksa kanalın varsayılanına düşülür. */
  lang?: string
  currency?: string
  customer?: CtxCustomer
  company?: CtxCompany
  priceListIds?: readonly number[]
  /** Verilmezse anonim aktör (oturum yolu madde 10.8). */
  actor?: CtxActor
  now: number
  requestId: string
}

/** İkincil alan adı birincile 301 döner; Ctx üretilmez (yönlendirmeyi `api/app.ts` yazar). */
export type BuildCtxResult = { kind: "ctx"; ctx: Ctx } | { kind: "redirect"; to: string }

function pickLang(
  requested: string | undefined,
  resolved: string,
  channel: Ctx["channel"],
): string {
  if (!requested) return resolved
  const hit = channel.langs.find((lang) => lang.toLowerCase() === requested.trim().toLowerCase())
  return hit ?? resolved
}

function pickCurrency(requested: string | undefined, channel: Ctx["channel"]): string {
  if (!requested) return channel.defaultCurrency
  const hit = channel.currencies.find(
    (currency) => currency.toUpperCase() === requested.trim().toUpperCase(),
  )
  return hit ?? channel.defaultCurrency
}

function assertInput(now: number, requestId: string): void {
  if (!Number.isInteger(now) || now < 0) throw new RangeError(`geçersiz now: ${String(now)}`)
  if (!requestId.trim()) throw new RangeError("requestId boş olamaz")
}

/**
 * Ctx kurulumu: kanal (bellek) + segment. Oturum yoksa `actor` anonimdir ve bu yol
 * **sıfır veritabanı turudur**: `platform` yalnız bağlama konur, hiçbir portu çağrılmaz.
 * `now` ve `requestId` dışarıdan enjekte edilir (testte sahtelenebilir).
 */
export function buildCtx(input: BuildCtxInput): BuildCtxResult {
  assertInput(input.now, input.requestId)
  const resolved = resolveRequestChannel({
    snapshot: input.snapshot,
    host: input.host,
    channelHeader: input.channelHeader,
  })
  if (resolved.kind === "redirect") return { kind: "redirect", to: resolved.to }

  const { channel } = resolved
  const lang = pickLang(input.lang, resolved.lang, channel)
  const currency = pickCurrency(input.currency, channel)
  const priceListIds = [...(input.priceListIds ?? [])]

  const ctx: Ctx = {
    platform: input.platform,
    api: input.api,
    channel,
    lang,
    currency,
    customer: input.customer,
    company: input.company,
    priceListIds,
    segment: segmentKey({ channel: channel.publicId, lang, currency, priceListIds }),
    actor: input.actor ?? { ...ANONYMOUS_ACTOR, permissions: new Set() },
    now: input.now,
    requestId: input.requestId,
  }
  return { kind: "ctx", ctx }
}
