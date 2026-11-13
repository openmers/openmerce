import { describe, expect, it } from "vitest"
import { assertChannelDeletable } from "./defaultChannel"
import { indexDomains, resolveChannel } from "./resolveChannel"
import type { Channel, ChannelDomain } from "./types"

const domain = (d: string, over: Partial<ChannelDomain> = {}): ChannelDomain => ({
  id: 1,
  channelId: 1,
  domain: d,
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
  code: "default",
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
  defaultTaxZoneId: null,
  defaultShippingZoneId: null,
  defaultPriceListId: null,
  createdAt: 0,
  updatedAt: 0,
  domains: [
    domain("shop.com", { isPrimary: true, secondaryMode: null }),
    domain("shop.net", { secondaryMode: "redirect" }),
    domain("shop.com.tr", { defaultLang: "tr" }),
  ],
}

const index = indexDomains([channel])

describe("resolveChannel", () => {
  it("birincil alan adı: kanalın dili; port ve büyük harf normalleşir", () => {
    expect(resolveChannel("SHOP.com:443", index)).toEqual({ kind: "serve", channel, lang: "en" })
  })

  it("ikincil redirect: birincile yönlendirir", () => {
    expect(resolveChannel("shop.net", index)).toEqual({ kind: "redirect", channel, to: "shop.com" })
  })

  it("ikincil serve: kendi diliyle sunar", () => {
    expect(resolveChannel("shop.com.tr.", index)).toEqual({ kind: "serve", channel, lang: "tr" })
  })

  it("bilinmeyen alan adı UNKNOWN_DOMAIN, varsayılana düşmez", () => {
    expect(() => resolveChannel("evil.com", index)).toThrow(
      expect.objectContaining({ code: "UNKNOWN_DOMAIN" }),
    )
  })
})

describe("assertChannelDeletable", () => {
  it("varsayılan kanal DEFAULT_CHANNEL, diğeri geçer", () => {
    expect(() => assertChannelDeletable(channel)).toThrow(
      expect.objectContaining({ code: "DEFAULT_CHANNEL" }),
    )
    expect(() => assertChannelDeletable({ ...channel, isDefault: false })).not.toThrow()
  })
})
