import { createLocation, createProduct, getProduct, linkLocationToChannel } from "@openmers/core"
import type Database from "better-sqlite3"
import { sqlitePlatform } from "../../../../packages/core/src/features/__testing__/sqlitePlatform"
import { catalogCtx, seedChannel, seedTaxCategory } from "../catalog/helpers"
import { scalar } from "../helpers"

/** Product with two variants + one warehouse linked to the channel; internal ids for reservation statements. */
export async function seedStock(conn: Database.Database) {
  const p = sqlitePlatform(conn)
  const channel = await seedChannel(p)
  seedTaxCategory(conn)
  const ctx = catalogCtx(p, channel)
  const product = await createProduct(ctx, {
    translations: [{ lang: "en", name: "Kalem", slug: "kalem" }],
    variants: [
      { sku: "K-1", taxCategoryCode: "standard" },
      { sku: "K-2", taxCategoryCode: "standard" },
    ],
  })
  const variants = (await getProduct(ctx, product.publicId))?.variants.map((v) => v.publicId) ?? []
  const location = await createLocation(ctx, { name: "Ana depo", countryCode: "TR" })
  await linkLocationToChannel(ctx, { locationPublicId: location.publicId, priority: 0 })
  const idOf = (table: string, publicId: string) =>
    scalar<number>(conn, `SELECT id FROM ${table} WHERE public_id = ?`, publicId) as number
  const [a, b] = variants as [string, string]
  return {
    p,
    ctx,
    product: product.publicId,
    variants: { a, b },
    location: location.publicId,
    ids: {
      a: idOf("product_variants", a),
      b: idOf("product_variants", b),
      location: idOf("stock_locations", location.publicId),
    },
  }
}

export function level(conn: Database.Database, variantId: number) {
  return conn
    .prepare("SELECT on_hand, reserved, safety, version FROM stock_levels WHERE variant_id = ?")
    .get(variantId) as { on_hand: number; reserved: number; safety: number; version: number }
}

export const count = (conn: Database.Database, sql: string, ...params: unknown[]) =>
  scalar<number>(conn, `SELECT count(*) FROM ${sql}`, ...params) ?? 0
