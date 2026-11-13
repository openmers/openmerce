import { channelDomains, channels } from "@openmers/db"
import { assertNoFullScan, describeOnTargets } from "@openmers/test-utils"
import { eq } from "drizzle-orm"
import { expect, it } from "vitest"
import { sqlitePlatform } from "../../__testing__/sqlitePlatform"
import { createDefaultChannel } from "../createDefaultChannel"
import { deleteChannel } from "./deleteChannel"
import { insertChannel, type NewChannel } from "./insertChannel"
import { insertChannelDomain } from "./insertChannelDomain"
import { loadChannels } from "./loadChannels"
import { updateChannel } from "./updateChannel"

const NOW = 1_700_000_000_000

const input = (over: Partial<NewChannel> = {}): NewChannel => ({
  publicId: "chn_0000000001",
  code: "main",
  defaultCurrency: "USD",
  currencies: ["USD"],
  defaultLang: "en",
  langs: ["en"],
  timezone: "UTC",
  ...over,
})

function need<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`${what} yok`)
  return value
}

describeOnTargets("channels sorguları", (getDb) => {
  const platform = () => sqlitePlatform(getDb())

  it("loadChannels boş DB'de boş; alan adlarını kanallarına bağlar, tek tur", async () => {
    const p = platform()
    expect(await loadChannels(p)).toEqual([])

    await createDefaultChannel(p, { publicId: "chn_a", code: "default", domain: "shop.com" }, NOW)
    await insertChannel(p, input({ publicId: "chn_b", code: "de" }), NOW)
    const de = need((await loadChannels(p))[1], "ikinci kanal")
    await insertChannelDomain(p, { channelId: de.id, domain: "de.shop.com" }, NOW)

    const loaded = await loadChannels(p)
    expect(p.batchCalls()).toBe(3) // her loadChannels = 1 tur
    expect(loaded).toHaveLength(2)
    expect(loaded[0]?.domains.map((d) => d.domain)).toEqual(["shop.com"])
    expect(loaded[1]?.domains.map((d) => d.domain)).toEqual(["de.shop.com"])
  })

  it("createDefaultChannel EN/USD ve birincil alan adını tek atomic'te yazar", async () => {
    const p = platform()
    await createDefaultChannel(p, { publicId: "chn_a", domain: "Shop.COM:443." }, NOW)
    const [ch] = await loadChannels(p)
    expect(ch).toMatchObject({ code: "default", defaultCurrency: "USD", defaultLang: "en" })
    expect(ch?.isDefault).toBe(true)
    expect(ch?.domains[0]).toMatchObject({
      domain: "shop.com",
      isPrimary: true,
      secondaryMode: null,
    })
  })

  it("ikinci varsayılan kanal reddedilir; ilk kanal ve alan adı kalır", async () => {
    const p = platform()
    await createDefaultChannel(p, { publicId: "chn_a", domain: "one.com" }, NOW)
    await expect(
      createDefaultChannel(p, { publicId: "chn_b", code: "second", domain: "two.com" }, NOW),
    ).rejects.toThrow(/UNIQUE/)
    expect(await loadChannels(p)).toHaveLength(1)
    expect(await p.db.select().from(channelDomains)).toHaveLength(1)
  })

  it("insertChannel: code tekrarı reddedilir, büyük harfli code küçük harfe çevrilir", async () => {
    const p = platform()
    await insertChannel(p, input(), NOW)
    await expect(insertChannel(p, input({ publicId: "chn_0000000002" }), NOW)).rejects.toThrow(
      /UNIQUE/,
    )
    await insertChannel(p, input({ publicId: "chn_0000000003", code: "UPPER" }), NOW)
    expect((await loadChannels(p)).map((c) => c.code)).toEqual(["main", "upper"])
  })

  it("insertChannel: para birimi ve dil listeleri kodda doğrulanır", async () => {
    const p = platform()
    await expect(insertChannel(p, input({ currencies: ["EUR"] }), NOW)).rejects.toMatchObject({
      code: "INVALID_CHANNEL",
    })
    await expect(insertChannel(p, input({ langs: ["tr"] }), NOW)).rejects.toMatchObject({
      code: "INVALID_CHANNEL",
    })
  })

  it("insertChannelDomain: aynı alan adı iki kanala, ikinci birincil aynı kanala eklenemez", async () => {
    const p = platform()
    await insertChannel(p, input(), NOW)
    await insertChannel(p, input({ publicId: "chn_0000000002", code: "second" }), NOW)
    const loaded = await loadChannels(p)
    const a = need(loaded[0], "birinci kanal")
    const b = need(loaded[1], "ikinci kanal")
    await insertChannelDomain(p, { channelId: a.id, domain: "a.com", isPrimary: true }, NOW)

    await expect(
      insertChannelDomain(p, { channelId: a.id, domain: "a.com" }, NOW),
    ).rejects.toThrow(/UNIQUE/)
    await expect(
      insertChannelDomain(p, { channelId: a.id, domain: "a2.com", isPrimary: true }, NOW),
    ).rejects.toThrow(/UNIQUE/)
    await expect(
      insertChannelDomain(p, { channelId: b.id, domain: "a.com" }, NOW),
    ).rejects.toThrow(/UNIQUE/)
  })

  it("insertChannelDomain küçük harfe çevirir; ham büyük harf DB check'ine takılır", async () => {
    const p = platform()
    await insertChannel(p, input(), NOW)
    const ch = need((await loadChannels(p))[0], "kanal")
    await insertChannelDomain(p, { channelId: ch.id, domain: "NEW.Example.COM:8443." }, NOW)
    expect((await loadChannels(p))[0]?.domains[0]?.domain).toBe("new.example.com")

    const channel = need((await p.db.select().from(channels))[0], "kanal satırı")
    expect(() =>
      getDb()
        .prepare(
          "INSERT INTO channel_domains (channel_id, domain, is_primary, created_at, updated_at) VALUES (?, ?, 0, ?, ?)",
        )
        .run(channel.id, "UPPER.com", NOW, NOW),
    ).toThrow(/channel_domains_domain_ck/)
    expect(
      await p.db.select().from(channelDomains).where(eq(channelDomains.domain, "UPPER.com")),
    ).toEqual([])
  })

  it("updateChannel her güncellemede settings_version'ı 1 artırır, updated_at değişir", async () => {
    const p = platform()
    await insertChannel(p, input(), NOW)
    const ch = need((await loadChannels(p))[0], "kanal")

    expect(await updateChannel(p, ch.id, { statementName: "ACME" }, NOW + 10)).toBe(1)
    let current = (await loadChannels(p))[0]
    expect(current).toMatchObject({
      settingsVersion: 1,
      updatedAt: NOW + 10,
      statementName: "ACME",
    })

    expect(await updateChannel(p, ch.id, { statementName: "ACME 2" }, NOW + 20)).toBe(1)
    current = (await loadChannels(p))[0]
    expect(current).toMatchObject({ settingsVersion: 2, updatedAt: NOW + 20 })
    expect(await updateChannel(p, 999, { statementName: "yok" }, NOW)).toBe(0)
  })

  it("varsayılan kanal silinmez", async () => {
    const p = platform()
    await createDefaultChannel(p, { publicId: "chn_a", domain: "one.com" }, NOW)
    const ch = need((await loadChannels(p))[0], "kanal")
    await expect(deleteChannel(p, ch)).rejects.toMatchObject({ code: "DEFAULT_CHANNEL" })
    expect(await loadChannels(p)).toHaveLength(1)
  })

  it("varsayılan olmayan kanal alan adlarıyla birlikte silinir", async () => {
    const p = platform()
    await insertChannel(p, input(), NOW)
    const ch = need((await loadChannels(p))[0], "kanal")
    await insertChannelDomain(p, { channelId: ch.id, domain: "a.com", isPrimary: true }, NOW)

    expect(await deleteChannel(p, ch)).toBe(1)
    expect(await loadChannels(p)).toEqual([])
    expect(await p.db.select().from(channelDomains)).toEqual([])
  })

  it("bellekteki kopya eskiyse SQL koruması silmez (etkilenen 0)", async () => {
    const p = platform()
    await insertChannel(p, input({ isDefault: true }), NOW)
    const ch = need((await loadChannels(p))[0], "kanal")
    await insertChannelDomain(p, { channelId: ch.id, domain: "a.com", isPrimary: true }, NOW)

    expect(await deleteChannel(p, { ...ch, isDefault: false })).toBe(0)
    expect(await loadChannels(p)).toHaveLength(1)
    expect(await p.db.select().from(channelDomains)).toHaveLength(1)
  })

  it("FK açıkken alan adı silinmeden kanal silinemez", async () => {
    const p = platform()
    await insertChannel(p, input(), NOW)
    const ch = need((await loadChannels(p))[0], "kanal")
    await insertChannelDomain(p, { channelId: ch.id, domain: "a.com" }, NOW)

    await expect(
      p.atomic([p.db.delete(channels).where(eq(channels.id, ch.id)).toSQL()]),
    ).rejects.toThrow(/FOREIGN KEY/)
    expect(await loadChannels(p)).toHaveLength(1)
  })

  it("domain araması indeksten yapılır (tam tarama yok)", () => {
    assertNoFullScan(getDb(), {
      sql: "SELECT channel_id FROM channel_domains WHERE domain = ?",
      params: ["shop.com"],
    })
  })
})
