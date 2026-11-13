import { type CatalogIndexCtx, createProduct, reindexProduct } from "@openmers/core"
import type Database from "better-sqlite3"
import { sqlitePlatform } from "../../../../packages/core/src/features/__testing__/sqlitePlatform"
import { catalogCtx, NOW, seedChannel, seedTaxCategory } from "../catalog/helpers"

/**
 * Default channel (en + tr) with a USD base price list, a second channel, and raw facet/collection rows
 * (no feature writes them yet). Products go through `createProduct`, the read model through the job.
 */
export async function seedCatalog(conn: Database.Database) {
  const p = sqlitePlatform(conn)
  const channel = await seedChannel(p)
  conn.prepare(`UPDATE channels SET langs = '["en","tr"]'`).run()
  seedTaxCategory(conn)
  const run = (sql: string, ...args: unknown[]) =>
    Number(conn.prepare(sql).run(...args).lastInsertRowid)
  const other = run(
    `INSERT INTO channels (public_id, code, default_currency, currencies, langs, created_at, updated_at)
     VALUES ('chn_other', 'other', 'EUR', '["EUR"]', '["en"]', ?, ?)`,
    NOW,
    NOW,
  )
  const list = run(
    `INSERT INTO price_lists (public_id, name, channel_id, currency, type, priority, includes_tax, created_at, updated_at)
     VALUES ('pl_base', 'Base', ?, 'USD', 'base', 0, 0, ?, ?)`,
    channel.id,
    NOW,
    NOW,
  )
  run("UPDATE channels SET default_price_list_id = ? WHERE id = ?", list, channel.id)

  const read = (lang = "en", channelId = channel.id): CatalogIndexCtx => ({
    platform: p,
    channel: { ...channel, id: channelId },
    lang,
  })
  const variantIds = (productPublicId: string) =>
    conn
      .prepare(
        `SELECT v.id FROM product_variants v JOIN products p ON p.id = v.product_id
         WHERE p.public_id = ? ORDER BY v.id`,
      )
      .pluck()
      .all(productPublicId) as number[]

  async function product(
    slug: string,
    names: { en: string; tr?: string },
    skus: string[],
    over: { now?: number; description?: string } = {},
  ) {
    const created = await createProduct(catalogCtx(p, channel, { now: over.now ?? NOW }), {
      translations: [
        { lang: "en", name: names.en, slug, description: over.description ?? null },
        ...(names.tr ? [{ lang: "tr", name: names.tr, slug: `${slug}-tr` }] : []),
      ],
      variants: skus.map((sku) => ({ sku, taxCategoryCode: "standard" })),
    })
    return created.publicId
  }

  const facets = new Map<string, number>()
  function facetValue(facet: string, value: string, isPrivate = false) {
    let facetId = facets.get(facet)
    if (facetId === undefined) {
      facetId = run(
        "INSERT INTO facets (code, private, created_at, updated_at) VALUES (?, ?, ?, ?)",
        facet,
        isPrivate ? 1 : 0,
        NOW,
        NOW,
      )
      facets.set(facet, facetId)
    }
    return run(
      "INSERT INTO facet_values (facet_id, code, created_at, updated_at) VALUES (?, ?, ?, ?)",
      facetId,
      value,
      NOW,
      NOW,
    )
  }
  const tag = (productPublicId: string, facetValueId: number) =>
    run(
      `INSERT INTO product_facet_values (product_id, facet_value_id, created_at)
       SELECT id, ?, ? FROM products WHERE public_id = ?`,
      facetValueId,
      NOW,
      productPublicId,
    )
  function collection(publicId: string, variants: number[]) {
    const id = run(
      "INSERT INTO collections (public_id, position, created_at, updated_at) VALUES (?, 0, ?, ?)",
      publicId,
      NOW,
      NOW,
    )
    run(
      "INSERT INTO collection_channels (collection_id, channel_id, created_at) VALUES (?, ?, ?)",
      id,
      channel.id,
      NOW,
    )
    for (const v of variants) {
      run("INSERT INTO collection_variants (collection_id, variant_id) VALUES (?, ?)", id, v)
    }
    return id
  }
  const price = (variantId: number, amount: number, minQty = 1) =>
    run(
      `INSERT INTO prices (price_list_id, variant_id, min_qty, amount, currency, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'USD', ?, ?)`,
      list,
      variantId,
      minQty,
      amount,
      NOW,
      NOW,
    )
  const reindex = (...publicIds: string[]) =>
    publicIds.reduce((done, id) => done.then(() => reindexProduct(p, id)), Promise.resolve())
  const count = (sql: string, ...args: unknown[]) =>
    Number(
      conn
        .prepare(`SELECT count(*) FROM ${sql}`)
        .pluck()
        .get(...args),
    )

  return {
    p,
    channel,
    other,
    read,
    product,
    variantIds,
    facetValue,
    tag,
    collection,
    price,
    reindex,
    count,
  }
}
