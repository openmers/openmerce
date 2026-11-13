import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { openMigratedDb } from "../testing/sqlite"

// Şema testi: migration'lar gerçek better-sqlite3 :memory: üzerinde (mock yok), her test taze DB.
let db: Database.Database
beforeEach(() => {
  db = openMigratedDb()
})
afterEach(() => db.close())

const indexSql = (name: string) =>
  db.prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?").pluck().get(name) as
    | string
    | undefined
const tableSql = (name: string) =>
  db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").pluck().get(name) as
    | string
    | undefined

const NOW = 1_700_000_000_000
const insertSetting = (scope: string, scopeId: number, key = "a.b") =>
  db
    .prepare(
      "INSERT INTO settings (scope, scope_id, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(scope, scopeId, key, "1", NOW, NOW)
const insertChannel = (code: string, isDefault = 0) =>
  db
    .prepare(
      `INSERT INTO channels (public_id, code, default_currency, currencies, langs, is_default, created_at, updated_at)
       VALUES (?, ?, 'USD', '["USD"]', '["en"]', ?, ?, ?)`,
    )
    .run(`chn_${code}`, code, isDefault, NOW, NOW).lastInsertRowid
const insertDomain = (
  channelId: number | bigint,
  domain: string,
  isPrimary = 0,
  mode: string | null = isPrimary ? null : "redirect",
) =>
  db
    .prepare(
      `INSERT INTO channel_domains (channel_id, domain, is_primary, secondary_mode, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(channelId, domain, isPrimary, mode, NOW, NOW)

describe("sqlite_master", () => {
  it("indeksler var, kısmi indekslerde WHERE SQL'de", () => {
    expect(indexSql("settings_scope_key_uq")).toMatch(/UNIQUE INDEX/)
    expect(indexSql("channels_public_id_uq")).toMatch(/UNIQUE INDEX/)
    expect(indexSql("channels_code_uq")).toMatch(/UNIQUE INDEX/)
    expect(indexSql("channels_default_uq")).toMatch(/WHERE .*is_default.* = 1/)
    expect(indexSql("channel_domains_domain_uq")).toMatch(/UNIQUE INDEX/)
    expect(indexSql("channel_domains_primary_uq")).toMatch(/WHERE .*is_primary.* = 1/)
    expect(indexSql("channel_domains_channel_idx")).toMatch(/INDEX/)
  })

  it("check kısıtları tablo SQL'inde", () => {
    for (const ck of ["settings_scope_ck", "settings_scope_id_ck", "settings_key_ck"]) {
      expect(tableSql("settings")).toContain(ck)
    }
    for (const ck of [
      "channels_code_ck",
      "channels_type_ck",
      "channels_default_currency_ck",
      "channels_access_ck",
      "channels_min_order_amounts_ck",
      "channels_settings_ck",
    ]) {
      expect(tableSql("channels")).toContain(ck)
    }
    for (const ck of [
      "channel_domains_domain_ck",
      "channel_domains_secondary_mode_ck",
      "channel_domains_primary_mode_ck",
    ]) {
      expect(tableSql("channel_domains")).toContain(ck)
    }
  })

  it("ertelenen FK sütunları yok", () => {
    expect(tableSql("channels")).not.toMatch(/zone_id|price_list_id/)
  })

  it("d1_migrations bütün dosyaları kaydetti", () => {
    const names = db.prepare("SELECT name FROM d1_migrations ORDER BY id").pluck().all()
    expect(names).toEqual([
      "0000_baseline.sql",
      "0001_settings.sql",
      "0002_channels.sql",
      "0003_admin-auth.sql",
      "0004_security.sql",
      "0005_events.sql",
    ])
  })
})

describe("settings", () => {
  it("geçerli scope/scope_id çiftlerini kabul eder", () => {
    insertSetting("global", 0)
    insertSetting("built_in_app", 0, "wishlist.enabled")
    insertSetting("channel", 1)
    insertSetting("admin_user", 1)
    insertSetting("customer", 1)
  })

  it("created_at zorunlu", () => {
    expect(() =>
      db
        .prepare(
          "INSERT INTO settings (scope, key, value, updated_at) VALUES ('global', 'a', '1', ?)",
        )
        .run(NOW),
    ).toThrow(/NOT NULL constraint failed: settings.created_at/)
  })

  it("geçersiz scope'u reddeder", () => {
    expect(() => insertSetting("user", 1)).toThrow(/CHECK constraint failed/)
  })

  it("geçersiz scope/scope_id çiftini reddeder", () => {
    expect(() => insertSetting("global", 5)).toThrow(/settings_scope_id_ck/)
    expect(() => insertSetting("channel", 0)).toThrow(/settings_scope_id_ck/)
  })

  it("boş anahtarı reddeder", () => {
    expect(() => insertSetting("global", 0, "")).toThrow(/settings_key_ck/)
  })

  it("(scope, scope_id, key) benzersiz", () => {
    insertSetting("channel", 1)
    insertSetting("channel", 2)
    expect(() => insertSetting("channel", 1)).toThrow(/UNIQUE constraint failed/)
  })
})

describe("channels", () => {
  it("varsayılanlar uygulanır", () => {
    insertChannel("default", 1)
    expect(db.prepare("SELECT * FROM channels").get()).toMatchObject({
      type: "b2c",
      default_lang: "en",
      access: "public",
      guest_checkout: 1,
      prices_include_tax: 0,
      timezone: "UTC",
      settings_version: 0,
      min_order_amounts: null,
      settings: "{}",
    })
  })

  it("min_order_amounts ve settings JSON nesnesi olmalı", () => {
    const id = insertChannel("default")
    const set = (col: string, v: string) =>
      db.prepare(`UPDATE channels SET ${col} = ? WHERE id = ?`).run(v, id)
    set("min_order_amounts", '{"USD":5000,"EUR":4500}')
    expect(
      db.prepare("SELECT min_order_amounts ->> '$.USD' FROM channels WHERE id = ?").pluck().get(id),
    ).toBe(5000)
    expect(() => set("min_order_amounts", "[5000]")).toThrow(/channels_min_order_amounts_ck/)
    expect(() => set("min_order_amounts", "5000")).toThrow(/channels_min_order_amounts_ck/)
    expect(() => set("min_order_amounts", "{bozuk")).toThrow(/malformed JSON/)
    expect(() => set("settings", "[]")).toThrow(/channels_settings_ck/)
  })

  it("ikinci varsayılan kanalı reddeder, varsayılan olmayanlar çoğalabilir", () => {
    insertChannel("default", 1)
    insertChannel("b2b")
    insertChannel("wholesale")
    expect(() => insertChannel("other", 1)).toThrow(/UNIQUE constraint failed: channels.is_default/)
  })

  it("kod tekrarını ve büyük harfli kodu reddeder", () => {
    insertChannel("default")
    expect(() => insertChannel("default")).toThrow(/UNIQUE constraint failed/)
    expect(() => insertChannel("Shop")).toThrow(/channels_code_ck/)
  })

  it("geçersiz type, access ve para birimini reddeder", () => {
    const id = insertChannel("default")
    const set = (col: string, v: string) =>
      db.prepare(`UPDATE channels SET ${col} = ? WHERE id = ?`).run(v, id)
    expect(() => set("type", "b2x")).toThrow(/channels_type_ck/)
    expect(() => set("access", "private")).toThrow(/channels_access_ck/)
    expect(() => set("default_currency", "US")).toThrow(/channels_default_currency_ck/)
  })
})

describe("channel_domains", () => {
  it("kanal başına ikinci birincil alan adını reddeder", () => {
    const a = insertChannel("a")
    const b = insertChannel("b")
    insertDomain(a, "a.example.com", 1)
    insertDomain(a, "www.a.example.com")
    insertDomain(b, "b.example.com", 1)
    expect(() => insertDomain(a, "shop.a.example.com", 1)).toThrow(
      /UNIQUE constraint failed: channel_domains.channel_id/,
    )
  })

  it("secondary_mode: birincilde boş, ikincilde redirect|serve", () => {
    const a = insertChannel("a")
    insertDomain(a, "a.example.com", 1)
    insertDomain(a, "en.a.example.com", 0, "serve")
    expect(() => insertDomain(a, "x.a.example.com", 0, null)).toThrow(
      /channel_domains_primary_mode_ck/,
    )
    expect(() => insertDomain(insertChannel("b"), "b.example.com", 1, "redirect")).toThrow(
      /channel_domains_primary_mode_ck/,
    )
    expect(() => insertDomain(a, "y.a.example.com", 0, "proxy")).toThrow(
      /channel_domains_secondary_mode_ck/,
    )
  })

  it("büyük harfli alan adını reddeder", () => {
    const a = insertChannel("a")
    expect(() => insertDomain(a, "Shop.Example.com")).toThrow(/channel_domains_domain_ck/)
  })

  it("aynı alan adı iki kanala eklenemez", () => {
    insertDomain(insertChannel("a"), "shop.example.com")
    expect(() => insertDomain(insertChannel("b"), "shop.example.com")).toThrow(
      /UNIQUE constraint failed: channel_domains.domain/,
    )
  })

  it("FK: olmayan kanala alan adı eklenemez, alan adı olan kanal silinemez", () => {
    expect(() => insertDomain(999, "x.example.com")).toThrow(/FOREIGN KEY constraint failed/)
    const a = insertChannel("a")
    insertDomain(a, "a.example.com")
    expect(() => db.prepare("DELETE FROM channels WHERE id = ?").run(a)).toThrow(
      /FOREIGN KEY constraint failed/,
    )
  })
})
