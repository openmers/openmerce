import { sql } from "drizzle-orm"
import { type AtomicStatement, sqlStatement } from "../../../platform"
import { toMatchQuery } from "../text/fold"
import {
  CARD_COLUMNS,
  type CatalogIndexCtx,
  type CatalogPage,
  decodeCursor,
  pageSize,
  toPage,
} from "./shared"

export type SearchInput = { q: string; cursor?: string; limit?: number }

/** Deepest result reachable by paging; relevance pages past it are not useful. */
export const SEARCH_MAX_OFFSET = 1000

/**
 * `catalog_fts MATCH` (folded prefix terms) → `catalog_index` by rowid, filtered to channel and language,
 * best `bm25` rank first. Relevance has no stable key, so the cursor carries the offset.
 */
export function searchQuery(input: {
  channelId: number
  lang: string
  match: string
  offset: number
  limit: number
}): AtomicStatement {
  return sqlStatement(sql`SELECT ${CARD_COLUMNS}, NULL AS k FROM catalog_fts
    JOIN catalog_index ci ON ci.rowid = catalog_fts.rowid
    WHERE catalog_fts MATCH ${input.match} AND ci.channel_id = ${input.channelId}
      AND ci.lang = ${input.lang}
    ORDER BY catalog_fts.rank, ci.variant_id LIMIT ${input.limit + 1} OFFSET ${input.offset}`)
}

export async function search(ctx: CatalogIndexCtx, input: SearchInput): Promise<CatalogPage> {
  const match = toMatchQuery(input.q, ctx.lang)
  if (!match) return { items: [], nextCursor: null }
  const offset = input.cursor ? Number(decodeCursor(input.cursor, "search")[1]) : 0
  const limit = pageSize(input.limit)
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > SEARCH_MAX_OFFSET) {
    return { items: [], nextCursor: null }
  }
  const [rows = []] = await ctx.platform.batch([
    searchQuery({ channelId: ctx.channel.id, lang: ctx.lang, match, offset, limit }),
  ])
  return toPage(rows, limit, (row) => ["search", offset + limit, Number(row.v)])
}
