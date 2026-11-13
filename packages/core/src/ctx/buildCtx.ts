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
  /** In-memory channel table; the anonymous path does not hit the database. */
  snapshot: ChannelSnapshot
  host?: string | null
  channelHeader?: string | null
  /** Requested language/currency; falls back to the channel default if the channel lacks it. */
  lang?: string
  currency?: string
  customer?: CtxCustomer
  company?: CtxCompany
  priceListIds?: readonly number[]
  /** Anonymous actor if not given (session path in item 10.8). */
  actor?: CtxActor
  now: number
  requestId: string
}

/** A secondary domain returns 301 to the primary; no Ctx is built (`api/app.ts` writes the redirect). */
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
 * Ctx setup: channel (memory) + segment. Without a session `actor` is anonymous and this path costs
 * **zero database round trips**: `platform` is only placed on the context, none of its ports are called.
 * `now` and `requestId` are injected from outside (can be faked in tests).
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
