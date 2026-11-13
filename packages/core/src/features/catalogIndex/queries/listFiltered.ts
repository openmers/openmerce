import { type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, sqlStatement } from "../../../platform"
import {
  existsFilter,
  type FilterInput,
  type MatchFilter,
  matchTable,
  resolveFilters,
} from "./filters"
import {
  CARD_COLUMNS,
  type CatalogIndexCtx,
  type CatalogPage,
  type Cursor,
  decodeCursor,
  pageSize,
  toPage,
} from "./shared"

/** `default` = match-table order (variant id); the others read a `catalog_index` sort index. */
export type CatalogSort = "default" | "name" | "newest" | "price"

export type ListFilteredInput = FilterInput & {
  sort?: CatalogSort
  cursor?: string
  limit?: number
}

export type ListQueryInput = {
  channelId: number
  lang: string
  filters: readonly MatchFilter[]
  sort: CatalogSort
  cursor?: Cursor
  limit: number
}

const SORT_KEY = {
  name: { column: sql.raw("ci.sort_name"), desc: false },
  newest: { column: sql.raw("ci.created_at"), desc: true },
  price: { column: sql.raw("ci.price_min"), desc: false },
} as const

/**
 * 02-katalog §4. Default sort starts from the most selective filter's match table (PK range by variant id)
 * and checks the rest with `EXISTS`; without filters it walks the `catalog_index` PK. A named sort walks its
 * `(channel_id, lang, group_first, key, variant_id)` index and checks every filter with `EXISTS`.
 */
export function listFilteredQuery(input: ListQueryInput): AtomicStatement {
  const { channelId, lang, cursor, limit } = input
  const filters = [...input.filters].sort((a, b) => a.count - b.count)
  const exists = (list: readonly MatchFilter[]) => list.map((f) => sql` AND ${existsFilter(f)}`)

  if (input.sort === "default") {
    const [drive, ...rest] = filters
    const after = cursor?.[2] ?? 0
    if (!drive) {
      return sqlStatement(sql`SELECT ${CARD_COLUMNS}, NULL AS k FROM catalog_index ci
        WHERE ci.channel_id = ${channelId} AND ci.lang = ${lang} AND ci.variant_id > ${after}
          AND ci.group_first = 1
        ORDER BY ci.variant_id LIMIT ${limit + 1}`)
    }
    const { table, column } = matchTable(drive)
    return sqlStatement(sql`SELECT ${CARD_COLUMNS}, NULL AS k FROM ${table} d
      JOIN catalog_index ci ON ci.channel_id = d.channel_id AND ci.lang = ${lang}
        AND ci.variant_id = d.variant_id
      WHERE d.channel_id = ${channelId} AND d.${column} = ${drive.id} AND d.variant_id > ${after}
        AND ci.group_first = 1${sql.join(exists(rest))}
      ORDER BY d.variant_id LIMIT ${limit + 1}`)
  }

  const { column, desc } = SORT_KEY[input.sort]
  const keyset: SQL = cursor
    ? desc
      ? sql` AND (${column}, ci.variant_id) < (${cursor[1]}, ${cursor[2]})`
      : sql` AND (${column}, ci.variant_id) > (${cursor[1]}, ${cursor[2]})`
    : sql``
  // shortcut: unpriced cards are left out of the price sort (they cannot be sold, 01-kanallar no_price)
  const priced = input.sort === "price" ? sql` AND ci.price_min IS NOT NULL` : sql``
  const order = desc ? sql`${column} DESC, ci.variant_id DESC` : sql`${column}, ci.variant_id`
  return sqlStatement(sql`SELECT ${CARD_COLUMNS}, ${column} AS k FROM catalog_index ci
    WHERE ci.channel_id = ${channelId} AND ci.lang = ${lang} AND ci.group_first = 1${priced}${keyset}${sql.join(exists(filters))}
    ORDER BY ${order} LIMIT ${limit + 1}`)
}

/** Filtered storefront list: one card per product, keyset cursor. */
export async function listFiltered(
  ctx: CatalogIndexCtx,
  input: ListFilteredInput = {},
): Promise<CatalogPage> {
  const sort = input.sort ?? "default"
  const cursor = input.cursor ? decodeCursor(input.cursor, sort) : undefined
  const filters = await resolveFilters(ctx, input)
  if (!filters) return { items: [], nextCursor: null }
  const limit = pageSize(input.limit)
  const query = listFilteredQuery({
    channelId: ctx.channel.id,
    lang: ctx.lang,
    filters,
    sort,
    cursor,
    limit,
  })
  const [rows = []] = await ctx.platform.batch([query])
  return toPage(rows, limit, (row) => [
    sort,
    (row.k as string | number | null) ?? null,
    Number(row.v),
  ])
}

/** Collection page: a range scan on `catalog_index_collections` + PK access (default sort). */
export function listCollection(
  ctx: CatalogIndexCtx,
  input: { collection: string; cursor?: string; limit?: number },
): Promise<CatalogPage> {
  return listFiltered(ctx, { ...input, sort: "default" })
}
