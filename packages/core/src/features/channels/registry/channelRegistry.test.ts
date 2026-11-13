import { describe, expect, it } from "vitest"
import type { Channel } from "../types"
import { createChannelRegistry } from "./channelRegistry"

const channel = (id: number, domain: string): Channel => ({
  id,
  publicId: `chn_000000000${id}`,
  code: `c${id}`,
  type: "b2c",
  defaultCurrency: "USD",
  currencies: ["USD"],
  defaultLang: "en",
  langs: ["en"],
  pricesIncludeTax: false,
  access: "public",
  guestCheckout: true,
  minOrderAmounts: null,
  syncPrices: false,
  statementName: null,
  timezone: "UTC",
  isDefault: id === 1,
  settings: {},
  settingsVersion: 0,
  defaultTaxZoneId: null,
  defaultShippingZoneId: null,
  defaultPriceListId: null,
  createdAt: 0,
  updatedAt: 0,
  domains: [
    {
      id,
      channelId: id,
      domain,
      defaultLang: null,
      isPrimary: true,
      secondaryMode: null,
      createdAt: 0,
      updatedAt: 0,
    },
  ],
})

describe("channelRegistry", () => {
  it("ilk çağrıda yükler; sürüm değişmedikçe yeniden yüklemez", async () => {
    let loads = 0
    const load = async () => {
      loads += 1
      return [channel(1, "a.com")]
    }
    const registry = createChannelRegistry({ load, version: async () => 0 })

    expect((await registry.get(0)).channels).toHaveLength(1)
    expect((await registry.get(1)).channels).toHaveLength(1)
    expect(loads).toBe(1)
  })

  it("settings_version değişince yeniler", async () => {
    let loads = 0
    let version = 0
    const registry = createChannelRegistry({
      load: async () => {
        loads += 1
        return loads === 1 ? [channel(1, "a.com")] : [channel(1, "a.com"), channel(2, "b.com")]
      },
      version: async () => version,
    })

    expect((await registry.get(0)).channels).toHaveLength(1)
    version = 1
    const snapshot = await registry.get(1)
    expect(snapshot.channels).toHaveLength(2)
    expect(snapshot.byDomain.get("b.com")?.channel.id).toBe(2)
    expect(snapshot.version).toBe(1)
  })

  it("eşzamanlı çağrılar tek yükleme paylaşır", async () => {
    let loads = 0
    const registry = createChannelRegistry({
      load: async () => {
        loads += 1
        return [channel(1, "a.com")]
      },
      version: async () => 0,
    })
    const [a, b] = await Promise.all([registry.get(0), registry.get(0)])
    expect(a).toBe(b)
    expect(loads).toBe(1)
  })

  it("checkEveryMs sürüm okumasını aralıklar", async () => {
    let versionReads = 0
    let version = 0
    const registry = createChannelRegistry({
      load: async () => [channel(1, "a.com")],
      version: async () => {
        versionReads += 1
        return version
      },
      checkEveryMs: 30_000,
    })

    await registry.get(0)
    version = 1
    await registry.get(10_000)
    expect(versionReads).toBe(1)
    await registry.get(30_001)
    expect(versionReads).toBe(2)
  })
})
