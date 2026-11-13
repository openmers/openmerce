import { describe, expect, it } from "vitest"
import type { Channel, ChannelDomain } from "../features/channels"
import { indexDomains } from "../features/channels"
import { channelFromHeader, resolveRequestChannel } from "./resolveChannel"

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

const channel = (over: Partial<Channel> = {}): Channel => ({
  id: 1,
  publicId: "chn_0000000001",
  code: "main",
  type: "b2c",
  defaultCurrency: "USD",
  currencies: ["USD"],
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
  createdAt: 0,
  updatedAt: 0,
  domains: [domain("shop.com", { isPrimary: true, secondaryMode: null })],
  ...over,
})

const main = channel()
const de = channel({
  id: 2,
  publicId: "chn_0000000002",
  code: "de",
  isDefault: false,
  domains: [domain("de.shop.com", { channelId: 2, defaultLang: "de" })],
})
const snapshot = { channels: [main, de], byDomain: indexDomains([main, de]), version: 1 }

describe("resolveRequestChannel", () => {
  it("Host ile kanalı ve alan adı dilini çözer", () => {
    expect(resolveRequestChannel({ snapshot, host: "SHOP.com:443" })).toEqual({
      kind: "serve",
      channel: main,
      lang: "en",
    })
    expect(resolveRequestChannel({ snapshot, host: "de.shop.com" })).toEqual({
      kind: "serve",
      channel: de,
      lang: "de",
    })
  })

  it("bilinmeyen alan adı UNKNOWN_DOMAIN (varsayılana düşmez)", () => {
    expect(() => resolveRequestChannel({ snapshot, host: "evil.com" })).toThrow(
      expect.objectContaining({ code: "UNKNOWN_DOMAIN" }),
    )
    expect(() => resolveRequestChannel({ snapshot })).toThrow(
      expect.objectContaining({ code: "UNKNOWN_DOMAIN" }),
    )
  })

  it("x-openmers-channel Host'tan önce gelir; code veya public_id kabul eder", () => {
    expect(
      resolveRequestChannel({ snapshot, host: "shop.com", channelHeader: "DE" }),
    ).toMatchObject({ kind: "serve", channel: de, lang: "en" })
    expect(
      resolveRequestChannel({ snapshot, host: "shop.com", channelHeader: "chn_0000000002" }),
    ).toMatchObject({ kind: "serve", channel: de })
  })

  it("başlık kanalı alan adı yönlendirmesini tetiklemez", () => {
    const redirecting = channel({
      domains: [
        domain("shop.com", { isPrimary: true, secondaryMode: null }),
        domain("shop.net", { secondaryMode: "redirect" }),
      ],
    })
    const withRedirect = {
      channels: [redirecting],
      byDomain: indexDomains([redirecting]),
      version: 1,
    }
    expect(resolveRequestChannel({ snapshot: withRedirect, host: "shop.net" })).toEqual({
      kind: "redirect",
      channel: redirecting,
      to: "shop.com",
    })
    expect(
      resolveRequestChannel({ snapshot: withRedirect, host: "shop.net", channelHeader: "main" }),
    ).toMatchObject({ kind: "serve", channel: redirecting })
  })

  it("bilinmeyen başlık INVALID_CHANNEL", () => {
    expect(() =>
      resolveRequestChannel({ snapshot, host: "shop.com", channelHeader: "yok" }),
    ).toThrow(expect.objectContaining({ code: "INVALID_CHANNEL" }))
  })

  it("boş başlık Host'a düşer", () => {
    expect(
      resolveRequestChannel({ snapshot, host: "shop.com", channelHeader: "   " }),
    ).toMatchObject({ kind: "serve", channel: main })
  })
})

describe("channelFromHeader", () => {
  it("boş anahtar undefined", () => {
    expect(channelFromHeader(snapshot, null)).toBeUndefined()
    expect(channelFromHeader(snapshot, "  ")).toBeUndefined()
  })
})
