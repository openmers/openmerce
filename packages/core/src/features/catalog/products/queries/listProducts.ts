import { products, productTranslations } from "@openmers/db"
import { and, desc, eq, inArray, isNull, lt, or, type SQL } from "drizzle-orm"
import type { Db } from "../../../../platform"
import type { CatalogCtx } from "../types"
import { decodeProductCursor, encodeProductCursor } from "./cursor"

export type ListProductsInput = { cursor?: string; limit?: number }

export type ProductListItem = {
  publicId: string
  version: number
  createdAt: number
  updatedAt: number
  name: string
  slug: string
}

export const PRODUCT_PAGE_DEFAULT = 50
export const PRODUCT_PAGE_MAX = 100

export function productPageSize(limit: number | undefined): number {
  return Math.min(Math.max(1, limit ?? PRODUCT_PAGE_DEFAULT), PRODUCT_PAGE_MAX)
}

/**
 * Anahtar kümesi (keyset) sayfası: `(updated_at, public_id)` azalan; `(deleted_at, updated_at)`
 * indeksi üzerinden yürür (`assertNoFullScan` testi). İmleç son satırın `updated_at`+`public_id`'si.
 */
export function listProductsQuery(db: Db, input: ListProductsInput = {}) {
  const filters: SQL[] = [isNull(products.deletedAt)]
  if (input.cursor) {
    const cursor = decodeProductCursor(input.cursor)
    const older = lt(products.updatedAt, cursor.updatedAt)
    const tie = and(
      eq(products.updatedAt, cursor.updatedAt),
      lt(products.publicId, cursor.publicId),
    )
    filters.push(or(older, tie) as SQL)
  }
  return db
    .select({
      id: products.id,
      publicId: products.publicId,
      version: products.version,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .where(and(...filters))
    .orderBy(desc(products.updatedAt), desc(products.publicId))
    .limit(productPageSize(input.limit) + 1)
}

/** Admin listesi: imleçli `{ items, nextCursor }`; ad/slug istenen dilden, yoksa ilk çeviriden. */
export async function listProducts(
  ctx: Pick<CatalogCtx, "platform" | "lang">,
  input: ListProductsInput = {},
): Promise<{ items: ProductListItem[]; nextCursor: string | null }> {
  const db = ctx.platform.db
  const limit = productPageSize(input.limit)
  const rows = await listProductsQuery(db, input)
  const page = rows.slice(0, limit)
  const ids = page.map((row) => row.id)
  const translations = ids.length
    ? await db
        .select()
        .from(productTranslations)
        .where(
          and(inArray(productTranslations.productId, ids), isNull(productTranslations.channelId)),
        )
        .orderBy(productTranslations.lang)
    : []

  const items = page.map((row) => {
    const forProduct = translations.filter((t) => t.productId === row.id)
    const chosen = forProduct.find((t) => t.lang === ctx.lang) ?? forProduct[0]
    return {
      publicId: row.publicId,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      name: chosen?.name ?? "",
      slug: chosen?.slug ?? "",
    }
  })
  const last = page.at(-1)
  return {
    items,
    nextCursor: rows.length > limit && last ? encodeProductCursor(last) : null,
  }
}
