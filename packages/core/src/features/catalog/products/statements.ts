import {
  optionValues,
  productChannels,
  productOptions,
  products,
  productVariants,
  variantChannels,
} from "@openmers/db"
import { and, eq, type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, type Db, guardedInsertStatement } from "../../../platform"
import type { OutboxJobInput } from "../../outbox"
import { CatalogError } from "./types"

// Internal `id` of a new row: a subquery via `public_id`/code inside a multi-statement `atomic()`.
// No interactive transaction; rows are written in order in the same transaction, so the subquery sees them.

export function productIdByPublicId(publicId: string): SQL {
  return sql`(SELECT ${products.id} FROM ${products} WHERE ${products.publicId} = ${publicId})`
}

export function variantIdByPublicId(publicId: string): SQL {
  return sql`(SELECT ${productVariants.id} FROM ${productVariants} WHERE ${productVariants.publicId} = ${publicId})`
}

export function taxCategoryIdByCode(code: string): SQL {
  return sql`(SELECT id FROM "tax_categories" WHERE "code" = ${code})`
}

export function optionIdByCode(productPublicId: string, code: string): SQL {
  return sql`(SELECT ${productOptions.id} FROM ${productOptions}
    WHERE ${productOptions.productId} = ${productIdByPublicId(productPublicId)}
      AND ${productOptions.code} = ${code})`
}

export function optionValueIdByCode(
  productPublicId: string,
  optionCode: string,
  valueCode: string,
): SQL {
  return sql`(SELECT ${optionValues.id} FROM ${optionValues}
    WHERE ${optionValues.optionId} = ${optionIdByCode(productPublicId, optionCode)}
      AND ${optionValues.code} = ${valueCode})`
}

/** Condition that the product is at the expected version and not deleted; the single gate for conditional writes. */
export function productVersionGuard(publicId: string, version: number): SQL {
  return sql`EXISTS (SELECT 1 FROM ${products}
    WHERE ${products.publicId} = ${publicId}
      AND ${products.version} = ${version}
      AND ${products.deletedAt} IS NULL)`
}

/** Condition that the product exists (when adding a new variant). */
export function productExistsGuard(publicId: string): SQL {
  return sql`EXISTS (SELECT 1 FROM ${products}
    WHERE ${products.publicId} = ${publicId} AND ${products.deletedAt} IS NULL)`
}

/** Condition that the variant exists (for a new variant's child rows). */
export function variantExistsGuard(publicId: string): SQL {
  return sql`EXISTS (SELECT 1 FROM ${productVariants}
    WHERE ${productVariants.publicId} = ${publicId} AND ${productVariants.deletedAt} IS NULL)`
}

/** The variant is under the product, at the expected version and not deleted. */
export function variantOfProductGuard(
  productPublicId: string,
  variantPublicId: string,
  version: number,
): SQL {
  return sql`EXISTS (SELECT 1 FROM ${productVariants}
    JOIN ${products} ON ${products.id} = ${productVariants.productId}
    WHERE ${productVariants.publicId} = ${variantPublicId}
      AND ${products.publicId} = ${productPublicId}
      AND ${productVariants.version} = ${version}
      AND ${productVariants.deletedAt} IS NULL)`
}

/** Channel-independent: the selected channel + the undeletable default channel (01-kanallar §2). */
const DEFAULT_CHANNEL = sql`EXISTS (SELECT 1 FROM "channels" WHERE "is_default" = 1)`

function ignoreConflict(stmt: AtomicStatement): AtomicStatement {
  return { ...stmt, sql: `${stmt.sql} on conflict do nothing` }
}

/**
 * Product channel assignments: the selected channel and the default channel (if any). Both statements are under `guard`;
 * when `guard` is tied to a new row's existence (e.g. a new variant) nothing is written. When the product is assigned,
 * all its variants are assigned too (01-kanallar §2).
 */
export function productChannelStatements(
  productPublicId: string,
  channelId: number,
  now: number,
  guard: SQL = sql`1 = 1`,
): AtomicStatement[] {
  const productId = productIdByPublicId(productPublicId)
  const values = { productId, channelId, createdAt: now }
  return [
    ignoreConflict(guardedInsertStatement(productChannels, values, guard)),
    ignoreConflict(
      guardedInsertStatement(
        productChannels,
        { ...values, channelId: sql`(SELECT "id" FROM "channels" WHERE "is_default" = 1)` },
        and(DEFAULT_CHANNEL, guard) as SQL,
      ),
    ),
  ]
}

export function variantChannelStatements(
  variantPublicId: string,
  channelId: number,
  now: number,
  guard: SQL = sql`1 = 1`,
): AtomicStatement[] {
  const variantId = variantIdByPublicId(variantPublicId)
  const values = { variantId, channelId, createdAt: now }
  return [
    ignoreConflict(guardedInsertStatement(variantChannels, values, guard)),
    ignoreConflict(
      guardedInsertStatement(
        variantChannels,
        { ...values, channelId: sql`(SELECT "id" FROM "channels" WHERE "is_default" = 1)` },
        and(DEFAULT_CHANNEL, guard) as SQL,
      ),
    ),
  ]
}

/** The product changed: `reindex(product)` job; no new one if the same job is pending (02-katalog §3). */
export function reindexJob(productPublicId: string, requestId?: string): OutboxJobInput {
  return {
    kind: "reindex",
    event: "product.changed",
    payload: { product: productPublicId },
    dedupeKey: `product:${productPublicId}`,
    requestId,
  }
}

/** A conditional write touched 0 rows: `NOT_FOUND` if the product is missing, otherwise a version conflict `CONFLICT`. */
export async function classifyProductMiss(db: Db, publicId: string): Promise<never> {
  const row = (
    await db
      .select({ deletedAt: products.deletedAt })
      .from(products)
      .where(eq(products.publicId, publicId))
      .limit(1)
  )[0]
  if (!row || row.deletedAt !== null) throw new CatalogError("NOT_FOUND", "ürün bulunamadı")
  throw new CatalogError("CONFLICT", "sürüm çakışması: ürün başka bir yazımla değişti")
}

/** A conditional write touched 0 rows: `NOT_FOUND` if the variant is missing, otherwise a version conflict `CONFLICT`. */
export async function classifyVariantMiss(db: Db, publicId: string): Promise<never> {
  const row = (
    await db
      .select({ deletedAt: productVariants.deletedAt })
      .from(productVariants)
      .where(eq(productVariants.publicId, publicId))
      .limit(1)
  )[0]
  if (!row || row.deletedAt !== null) throw new CatalogError("NOT_FOUND", "varyant bulunamadı")
  throw new CatalogError("CONFLICT", "sürüm çakışması: varyant başka bir yazımla değişti")
}

/** Duplicate translation language within the payload (the DB unique index is the last gate). */
export function assertUniqueLangs(translations: ReadonlyArray<{ lang: string }>): void {
  const seen = new Set<string>()
  for (const { lang } of translations) {
    const key = lang.trim().toLowerCase()
    if (key.length === 0) throw new CatalogError("INVALID_INPUT", "dil kodu boş olamaz")
    if (seen.has(key)) throw new CatalogError("INVALID_INPUT", `dil yineleniyor: ${lang}`)
    seen.add(key)
  }
}

/** Two values from the same option in variant option values (the DB unique index is the last gate). */
export function assertUniqueOptionValues(
  entries: ReadonlyArray<{ option: string }> | undefined,
): void {
  const seen = new Set<string>()
  for (const entry of entries ?? []) {
    const key = entry.option.trim()
    if (seen.has(key))
      throw new CatalogError("INVALID_INPUT", `seçenekten birden çok değer: ${key}`)
    seen.add(key)
  }
}

/**
 * Maps SQLite errors to expected catalog errors; any other error is rethrown as is.
 * Unique indexes are the last gate: in-payload checks cannot catch races.
 */
export function mapWriteError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error)
  if (/UNIQUE/i.test(message) && /product_variants\.sku/i.test(message)) {
    throw new CatalogError("CONFLICT", "SKU zaten kullanılıyor")
  }
  if (/UNIQUE/i.test(message) && /slug/i.test(message)) {
    throw new CatalogError("CONFLICT", "slug bu dilde zaten kullanılıyor")
  }
  if (/NOT NULL/i.test(message) && /tax_category_id/i.test(message)) {
    throw new CatalogError("INVALID_INPUT", "vergi kategorisi bulunamadı")
  }
  if (/NOT NULL/i.test(message) && /option_(value_)?id/i.test(message)) {
    throw new CatalogError("INVALID_INPUT", "seçenek ya da seçenek değeri bulunamadı")
  }
  throw error
}
