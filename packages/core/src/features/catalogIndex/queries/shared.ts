import { sql } from "drizzle-orm"
import type { Ctx } from "../../../ctx"
import type { Storage } from "../../../platform"
import { type ImageView, imageView, type StoredImage } from "../../media"
import type { StockBucket } from "../../stock"

/** Storefront reads only need the platform, the resolved channel and the language. */
export type CatalogIndexCtx = Pick<Ctx, "platform" | "channel" | "lang">

export class CatalogIndexError extends Error {
  constructor(
    readonly code: "INVALID_INPUT",
    message: string,
  ) {
    super(message)
    this.name = "CatalogIndexError"
  }
}

/** One card per product; no internal id leaves the read model. */
export type CatalogCard = {
  product: string
  slug: string
  name: string
  sku: string
  thumb: ImageView | null
  priceMin: number | null
  priceMax: number | null
  currency: string
  stockBucket: StockBucket
  leadTimeDays: number | null
}

export type CatalogPage = { items: CatalogCard[]; nextCursor: string | null }

export const PAGE_DEFAULT = 24
export const PAGE_MAX = 100

export const pageSize = (limit: number | undefined) =>
  Math.min(Math.max(1, Math.trunc(limit ?? PAGE_DEFAULT)), PAGE_MAX)

/** Card columns of `catalog_index ci` plus the keyset values (`k`, `v`) of the row. */
export const CARD_COLUMNS = sql.raw(`ci.product_public_id, ci.slug, ci.name, ci.sku, ci.thumb,
  ci.price_min, ci.price_max, ci.currency, ci.stock_bucket, ci.lead_time_days, ci.variant_id AS v`)

export function toCard(storage: Pick<Storage, "url">, row: Record<string, unknown>): CatalogCard {
  return {
    product: row.product_public_id as string,
    slug: row.slug as string,
    name: row.name as string,
    sku: row.sku as string,
    thumb:
      typeof row.thumb === "string"
        ? imageView(storage, JSON.parse(row.thumb) as StoredImage)
        : null,
    priceMin: (row.price_min as number | null) ?? null,
    priceMax: (row.price_max as number | null) ?? null,
    currency: row.currency as string,
    stockBucket: row.stock_bucket as StockBucket,
    leadTimeDays: (row.lead_time_days as number | null) ?? null,
  }
}

/**
 * Opaque keyset cursor: `[mode, key, variant]`. The variant id is the documented tie-breaker of every
 * storefront index; it is encoded, not exposed as a field.
 */
export type Cursor = [mode: string, key: string | number | null, variant: number]

// base64url over UTF-8 with web APIs only (Workers and Node)
export function encodeCursor(cursor: Cursor): string {
  const bytes = new TextEncoder().encode(JSON.stringify(cursor))
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "")
}

export function decodeCursor(value: string, mode: string): Cursor {
  try {
    const parsed: unknown = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), (c) =>
          c.charCodeAt(0),
        ),
      ),
    )
    if (
      Array.isArray(parsed) &&
      parsed.length === 3 &&
      parsed[0] === mode &&
      (parsed[1] === null || ["string", "number"].includes(typeof parsed[1])) &&
      Number.isSafeInteger(parsed[2])
    ) {
      return parsed as Cursor
    }
  } catch {}
  throw new CatalogIndexError("INVALID_INPUT", "geçersiz imleç")
}

/** `rows` were fetched with `limit + 1`; the extra row only says that a next page exists. */
export function toPage(
  storage: Pick<Storage, "url">,
  rows: Record<string, unknown>[],
  limit: number,
  cursorOf: (row: Record<string, unknown>) => Cursor,
): CatalogPage {
  const page = rows.slice(0, limit)
  const last = page.at(-1)
  return {
    items: page.map((row) => toCard(storage, row)),
    nextCursor: rows.length > limit && last ? encodeCursor(cursorOf(last)) : null,
  }
}
