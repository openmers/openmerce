import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { NOW, seeder } from "../testing/commerce"
import { openMigratedDb } from "../testing/sqlite"

// 0006_catalog: gerçek better-sqlite3 :memory:, foreign_keys=ON, her test taze DB.
let db: Database.Database
let s: ReturnType<typeof seeder>
beforeEach(() => {
  db = openMigratedDb()
  s = seeder(db)
})
afterEach(() => db.close())

const translation = (productId: number, lang: string, slug: string, channelId: number | null) =>
  s.run(
    `INSERT INTO product_translations (product_id, lang, channel_id, name, slug, created_at, updated_at)
     VALUES (?, ?, ?, 'Ad', ?, ?, ?)`,
    productId,
    lang,
    channelId,
    slug,
    NOW,
    NOW,
  )

describe("sqlite_master", () => {
  it("benzersiz, kısmi ve ifade indeksleri var", () => {
    expect(s.indexSql("product_variants_sku_uq")).toMatch(
      /UNIQUE INDEX .*WHERE .*deleted_at.* IS NULL/,
    )
    expect(s.indexSql("product_translations_uq")).toMatch(
      /UNIQUE INDEX .*ifnull\(`channel_id`, 0\)/,
    )
    for (const idx of [
      "products_public_id_uq",
      "product_variants_public_id_uq",
      "product_translations_slug_uq",
      "product_options_code_uq",
      "option_values_code_uq",
      "facets_code_uq",
      "facet_values_code_uq",
      "collections_public_id_uq",
      "collection_translations_slug_uq",
    ]) {
      expect(s.indexSql(idx), idx).toMatch(/UNIQUE INDEX/)
    }
    for (const idx of [
      "products_deleted_updated_idx",
      "product_variants_product_idx",
      "product_variants_base_idx",
      "product_channels_channel_idx",
      "variant_channels_channel_idx",
      "collection_channels_channel_idx",
      "collection_variants_variant_idx",
      "collections_parent_idx",
      "product_assets_product_idx",
      "product_assets_asset_idx",
    ]) {
      expect(s.indexSql(idx), idx).toMatch(/INDEX/)
    }
  })
})

describe("product_variants", () => {
  it("SKU yalnız silinmemiş varyantlar arasında benzersiz", () => {
    const p = s.product()
    const v = s.variant(p, "A-1")
    expect(() => s.variant(p, "A-1")).toThrow(/UNIQUE constraint failed/)
    s.run("UPDATE product_variants SET deleted_at = ? WHERE id = ?", NOW, v)
    s.variant(p, "A-1")
  })

  it("unit_factor ≥ 1, backorder_floor ≤ 0, taban kendisi olamaz", () => {
    const v = s.variant(s.product())
    expect(() => s.run("UPDATE product_variants SET unit_factor = 0 WHERE id = ?", v)).toThrow(
      /product_variants_unit_factor_ck/,
    )
    expect(() => s.run("UPDATE product_variants SET backorder_floor = 1 WHERE id = ?", v)).toThrow(
      /product_variants_backorder_floor_ck/,
    )
    expect(() => s.run("UPDATE product_variants SET base_variant_id = id WHERE id = ?", v)).toThrow(
      /product_variants_base_ck/,
    )
  })

  it("FK: olmayan ürün ve vergi kategorisi reddedilir", () => {
    expect(() => s.variant(999)).toThrow(/FOREIGN KEY constraint failed/)
    expect(() => s.variant(s.product(), "X", 999)).toThrow(/FOREIGN KEY constraint failed/)
  })
})

describe("product_translations", () => {
  it("(ürün, dil, kanal) NULL kanalda da tek; slug dil başına benzersiz", () => {
    const p = s.product()
    const c = s.channel()
    translation(p, "en", "shirt", null)
    expect(() => translation(p, "en", "shirt-2", null)).toThrow(/UNIQUE constraint failed/)
    translation(p, "en", "shirt-c", c)
    expect(() => translation(p, "en", "shirt-c2", c)).toThrow(/UNIQUE constraint failed/)
    expect(() => translation(s.product(), "en", "shirt", null)).toThrow(
      /product_translations.lang, product_translations.slug/,
    )
    translation(s.product(), "tr", "shirt", null)
  })
})

describe("bağlantı tabloları", () => {
  it("çift (ürün, kanal) reddedilir; kanal FK'si", () => {
    const p = s.product()
    const c = s.channel()
    const link = (channelId: number) =>
      s.run(
        "INSERT INTO product_channels (product_id, channel_id, created_at) VALUES (?, ?, ?)",
        p,
        channelId,
        NOW,
      )
    link(c)
    expect(() => link(c)).toThrow(/UNIQUE constraint failed/)
    expect(() => link(999)).toThrow(/FOREIGN KEY constraint failed/)
  })
})

describe("product_assets", () => {
  it("varyant ve seçenek değeri aynı anda dolu olamaz; medya FK'si", () => {
    const p = s.product()
    const v = s.variant(p)
    const o = s.run(
      "INSERT INTO product_options (product_id, code, position, created_at, updated_at) VALUES (?, 'color', 0, ?, ?)",
      p,
      NOW,
      NOW,
    )
    const ov = s.run(
      "INSERT INTO option_values (option_id, code, position, created_at, updated_at) VALUES (?, 'red', 0, ?, ?)",
      o,
      NOW,
      NOW,
    )
    const asset = (variantId: number | null, optionValueId: number | null, mediaId = s.media()) =>
      s.run(
        `INSERT INTO product_assets (product_id, variant_id, option_value_id, asset_id, position, created_at)
         VALUES (?, ?, ?, ?, 0, ?)`,
        p,
        variantId,
        optionValueId,
        mediaId,
        NOW,
      )
    asset(v, null)
    asset(null, ov)
    expect(() => asset(v, ov)).toThrow(/product_assets_level_ck/)
    expect(() => asset(null, null, 999)).toThrow(/FOREIGN KEY constraint failed/)
  })
})
