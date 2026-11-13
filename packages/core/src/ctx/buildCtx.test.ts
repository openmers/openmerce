import { openTestDb } from "@openmers/test-utils"
import { describe, expect, it } from "vitest"
import { sqlitePlatform } from "../features/__testing__/sqlitePlatform"
import type { Channel, ChannelDomain } from "../features/channels"
import { indexDomains } from "../features/channels"
import type { Platform } from "../platform"
import { buildCtx } from "./buildCtx"
import { segmentKey } from "./segment"

const domain = (name: string, over: Partial<ChannelDomain> = {}): ChannelDomain => ({
  id: 1,
  channelId: 1,
  domain: name,
  defaultLang: null,
  isPrimary: false,
  secondaryMode: "serve",
  createdAt: 0,
  updatedAt: 0,
  ...over,
})

const channel: Channel = {
  id: 1,
  publicId: "chn_0000000001",
  code: "main",
  type: "b2c",
  defaultCurrency: "USD",
  currencies: ["USD", "EUR"],
  defaultLang: "en",
  langs: ["en", "tr"],
  pricesIncludeTax: false,
  access: "public",
  guestCheckout: true,
  minOrderAmounts: null,
  syncPrices: false,
  statementName: null,
  timezone: "UTC",
  isDefault: true,
  settings: {},
  settingsVersion: 0,
  defaultTaxZoneId: null,
  defaultShippingZoneId: null,
  defaultPriceListId: null,
  createdAt: 0,
  updatedAt: 0,
  domains: [
    domain("shop.com", { isPrimary: true, secondaryMode: null }),
    domain("shop.net", { secondaryMode: "redirect" }),
    domain("tr.shop.com", { defaultLang: "tr" }),
  ],
}

const snapshot = { channels: [channel], byDomain: indexDomains([channel]), version: 1 }

/** Throws if any field is read: proof that the anonymous path does not touch the platform. */
function untouchablePlatform(): { platform: Platform; reads: () => string[] } {
  const reads: string[] = []
  const platform = new Proxy({} as Platform, {
    get(_target, prop) {
      reads.push(String(prop))
      throw new Error(`platform.${String(prop)} okundu`)
    },
  })
  return { platform, reads: () => reads }
}

const NOW = 1_700_000_000_000

describe("buildCtx", () => {
  it("the anonymous path never touches the platform (zero reads, zero round trips)", () => {
    const { platform, reads } = untouchablePlatform()
    const result = buildCtx({
      platform,
      api: "shop",
      snapshot,
      host: "shop.com",
      now: NOW,
      requestId: "req_1",
    })
    expect(result.kind).toBe("ctx")
    expect(reads()).toEqual([])
  })

  it("does not call batch/atomic on a real platform either; the channel comes from memory", () => {
    const p = sqlitePlatform(openTestDb())
    const platform = p as unknown as Platform
    const result = buildCtx({
      platform,
      api: "shop",
      snapshot,
      host: "tr.shop.com",
      now: NOW,
      requestId: "req_2",
    })
    if (result.kind !== "ctx") throw new Error("ctx bekleniyordu")
    expect(p.batchCalls()).toBe(0)
    expect(result.ctx).toMatchObject({
      api: "shop",
      channel,
      lang: "tr",
      currency: "USD",
      now: NOW,
      requestId: "req_2",
      priceListIds: [],
    })
    expect(result.ctx.actor.type).toBe("anonymous")
    expect(result.ctx.actor.permissions.size).toBe(0)
    expect(result.ctx.customer).toBeUndefined()
    expect(result.ctx.company).toBeUndefined()
  })

  it("segment comes from channel + language + currency + price list set", () => {
    const { platform } = untouchablePlatform()
    const build = (priceListIds: number[]) =>
      buildCtx({
        platform,
        api: "shop",
        snapshot,
        host: "shop.com",
        lang: "TR",
        currency: "eur",
        priceListIds,
        now: NOW,
        requestId: "req_3",
      })
    const a = build([7, 2])
    const b = build([2, 7])
    if (a.kind !== "ctx" || b.kind !== "ctx") throw new Error("ctx bekleniyordu")
    expect(a.ctx.lang).toBe("tr")
    expect(a.ctx.currency).toBe("EUR")
    expect(a.ctx.segment).toBe(
      segmentKey({ channel: channel.publicId, lang: "tr", currency: "EUR", priceListIds: [2, 7] }),
    )
    expect(a.ctx.segment).toBe(b.ctx.segment)
    expect(a.ctx.priceListIds).toEqual([7, 2])
  })

  it("a language/currency not in the channel falls back to the channel default", () => {
    const { platform } = untouchablePlatform()
    const result = buildCtx({
      platform,
      api: "shop",
      snapshot,
      host: "shop.com",
      lang: "de",
      currency: "GBP",
      now: NOW,
      requestId: "req_4",
    })
    if (result.kind !== "ctx") throw new Error("ctx bekleniyordu")
    expect(result.ctx.lang).toBe("en")
    expect(result.ctx.currency).toBe("USD")
  })

  it("x-openmers-channel overrides Host; unknown channel INVALID_CHANNEL", () => {
    const { platform } = untouchablePlatform()
    const result = buildCtx({
      platform,
      api: "shop",
      snapshot,
      host: "evil.com",
      channelHeader: "main",
      now: NOW,
      requestId: "req_5",
    })
    expect(result).toMatchObject({ kind: "ctx", ctx: { channel } })
    expect(() =>
      buildCtx({
        platform,
        api: "shop",
        snapshot,
        channelHeader: "yok",
        now: NOW,
        requestId: "req_6",
      }),
    ).toThrow(expect.objectContaining({ code: "INVALID_CHANNEL" }))
  })

  it("unknown domain and secondary redirect produce no Ctx", () => {
    const { platform } = untouchablePlatform()
    expect(() =>
      buildCtx({ platform, api: "shop", snapshot, host: "evil.com", now: NOW, requestId: "r" }),
    ).toThrow(expect.objectContaining({ code: "UNKNOWN_DOMAIN" }))
    expect(
      buildCtx({ platform, api: "shop", snapshot, host: "shop.net", now: NOW, requestId: "r" }),
    ).toEqual({ kind: "redirect", to: "shop.com" })
  })

  it("the given actor is kept (the session path supplies it from outside)", () => {
    const { platform } = untouchablePlatform()
    const actor = { type: "admin", id: 4, permissions: new Set(["orders:read"]) } as const
    const result = buildCtx({
      platform,
      api: "admin",
      snapshot,
      host: "shop.com",
      actor,
      now: NOW,
      requestId: "req_7",
    })
    if (result.kind !== "ctx") throw new Error("ctx bekleniyordu")
    expect(result.ctx.actor).toBe(actor)
    expect(result.ctx.api).toBe("admin")
  })

  it("now and requestId are validated", () => {
    const { platform } = untouchablePlatform()
    const input = { platform, api: "shop" as const, snapshot, host: "shop.com", now: NOW }
    expect(() => buildCtx({ ...input, requestId: "  " })).toThrow(RangeError)
    expect(() => buildCtx({ ...input, now: 1.5, requestId: "r" })).toThrow(RangeError)
    expect(() => buildCtx({ ...input, now: -1, requestId: "r" })).toThrow(RangeError)
  })
})
