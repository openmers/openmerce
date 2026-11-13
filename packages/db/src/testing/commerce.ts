import type Database from "better-sqlite3"

// Ticaret şema testleri (0006-0010) için en küçük satırlar; yalnız testler kullanır.

export const NOW = 1_700_000_000_000

let seq = 0
const next = () => ++seq

export function seeder(db: Database.Database) {
  const run = (sql: string, ...args: unknown[]) =>
    Number(db.prepare(sql).run(...args).lastInsertRowid)
  const indexSql = (name: string) =>
    db
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?")
      .pluck()
      .get(name) as string | undefined
  /** EXPLAIN QUERY PLAN satırları; `assertNoFullScan` test-utils'te (db → test-utils döngüsü). */
  const plan = (sql: string, ...args: unknown[]) =>
    (db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...args) as { detail: string }[]).map(
      (r) => r.detail,
    )

  const channel = () => {
    const n = next()
    return run(
      `INSERT INTO channels (public_id, code, default_currency, currencies, langs, created_at, updated_at)
       VALUES (?, ?, 'USD', '["USD"]', '["en"]', ?, ?)`,
      `chn_${n}`,
      `c${n}`,
      NOW,
      NOW,
    )
  }
  const taxCategory = (code = `cat${next()}`) =>
    run(
      "INSERT INTO tax_categories (code, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
      code,
      code,
      NOW,
      NOW,
    )
  const product = () =>
    run(
      "INSERT INTO products (public_id, created_at, updated_at) VALUES (?, ?, ?)",
      `prod_${next()}`,
      NOW,
      NOW,
    )
  const variant = (productId: number, sku = `SKU-${next()}`, taxCategoryId = taxCategory()) =>
    run(
      `INSERT INTO product_variants (public_id, product_id, sku, tax_category_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      `var_${next()}`,
      productId,
      sku,
      taxCategoryId,
      NOW,
      NOW,
    )
  const location = () =>
    run(
      "INSERT INTO stock_locations (public_id, name, created_at, updated_at) VALUES (?, 'Depo', ?, ?)",
      `loc_${next()}`,
      NOW,
      NOW,
    )
  const zone = () =>
    run(
      "INSERT INTO zones (public_id, name, created_at, updated_at) VALUES (?, 'Bölge', ?, ?)",
      `zon_${next()}`,
      NOW,
      NOW,
    )
  const media = (key = `k/${next()}`) =>
    run(
      `INSERT INTO media (public_id, status, bucket, key, created_at, updated_at)
       VALUES (?, 'ready', 'public', ?, ?, ?)`,
      `med_${next()}`,
      key,
      NOW,
      NOW,
    )

  return { run, indexSql, plan, channel, taxCategory, product, variant, location, zone, media }
}
