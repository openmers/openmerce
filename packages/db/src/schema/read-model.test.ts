import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { NOW, seeder } from "../testing/commerce"
import { openMigratedDb } from "../testing/sqlite"

// 0018_read-model: real better-sqlite3 :memory:, foreign_keys=ON, fresh DB per test.
let db: Database.Database
let s: ReturnType<typeof seeder>
beforeEach(() => {
  db = openMigratedDb()
  s = seeder(db)
})
afterEach(() => db.close())

const tableSql = (name: string) =>
  db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").pluck().get(name) as
    | string
    | undefined

const indexRow = (variantId: number, bucket = "in_stock") =>
  s.run(
    `INSERT INTO catalog_index (channel_id, lang, variant_id, product_id, product_public_id, slug, name,
       sku, currency, stock_bucket, sort_name, created_at, group_first)
     VALUES (1, 'en', ?, 1, 'prod_1', 'shirt', 'Shirt', 'SKU', 'USD', ?, 'shirt', ?, 1)`,
    variantId,
    bucket,
    NOW,
  )

describe("sqlite_master", () => {
  it("indexes exist", () => {
    for (const name of [
      "catalog_index_name_idx",
      "catalog_index_created_idx",
      "catalog_index_price_idx",
      "catalog_index_sales_idx",
      "catalog_index_product_idx",
      "product_view_product_idx",
      "customer_stats_last_order_idx",
      "customer_stats_orders_count_idx",
    ]) {
      expect(s.indexSql(name)).toMatch(/INDEX/)
    }
    expect(s.indexSql("customer_spend_net_idx")).toMatch(/"total_paid" - "total_refunded"/)
  })

  it("match tables are WITHOUT ROWID, catalog_index keeps its rowid", () => {
    expect(tableSql("catalog_index_facets")).toMatch(/WITHOUT ROWID/)
    expect(tableSql("catalog_index_collections")).toMatch(/WITHOUT ROWID/)
    expect(tableSql("catalog_index")).not.toMatch(/WITHOUT ROWID/)
  })

  it("FTS5 tables exist with the documented columns", () => {
    expect(tableSql("catalog_fts")).toMatch(
      /USING fts5\(`name`, `sku`, `facet_text`, `description_excerpt`/,
    )
    expect(tableSql("customer_search")).toMatch(
      /USING fts5\(`email`, `name`, `phone_digits`, `company_name`, `phone_reversed`/,
    )
  })
})

describe("catalog_index", () => {
  it("PK (channel, lang, variant) and stock bucket check", () => {
    indexRow(1)
    expect(() => indexRow(1)).toThrow(/UNIQUE constraint failed/)
    expect(() => indexRow(2, "in")).toThrow(/catalog_index_stock_bucket_ck/)
  })

  it("FTS row links by rowid and matches a prefix", () => {
    const rowid = indexRow(1)
    s.run(
      "INSERT INTO catalog_fts (rowid, name, sku, facet_text, description_excerpt) VALUES (?, ?, ?, ?, ?)",
      rowid,
      "isik lamba",
      "ts s red",
      "",
      "",
    )
    const hit = db
      .prepare(
        `SELECT ci.variant_id FROM catalog_fts JOIN catalog_index ci ON ci.rowid = catalog_fts.rowid
         WHERE catalog_fts MATCH ?`,
      )
      .pluck()
      .all('"isi"*')
    expect(hit).toEqual([1])
  })

  it("collection page plan: range on the match table + PK access", () => {
    const detail = s
      .plan(
        `SELECT ci.name FROM catalog_index_collections cc
         JOIN catalog_index ci ON ci.channel_id = cc.channel_id AND ci.lang = ? AND ci.variant_id = cc.variant_id
         WHERE cc.channel_id = ? AND cc.collection_id = ? AND cc.variant_id > ? ORDER BY cc.variant_id`,
        "en",
        1,
        1,
        0,
      )
      .join("\n")
    expect(detail).toMatch(/SEARCH cc USING PRIMARY KEY/)
    expect(detail).toMatch(/SEARCH ci USING INDEX sqlite_autoindex_catalog_index_1/)
  })
})

describe("customer read tables", () => {
  it("customer FK enforced; spend PK per currency", () => {
    const c = s.customer()
    const spend = (currency: string) =>
      s.run(
        `INSERT INTO customer_spend (customer_id, currency, total_paid, total_refunded, updated_at)
         VALUES (?, ?, 100, 0, ?)`,
        c,
        currency,
        NOW,
      )
    spend("USD")
    spend("EUR")
    expect(() => spend("USD")).toThrow(/UNIQUE constraint failed/)
    expect(() => spend("US")).toThrow(/customer_spend_currency_ck/)
    expect(() =>
      s.run(
        `INSERT INTO customer_stats (customer_id, orders_count, paid_orders_count, updated_at)
         VALUES (999, 0, 0, ?)`,
        NOW,
      ),
    ).toThrow(/FOREIGN KEY constraint failed/)
  })
})
