import { type SQL, sql } from "drizzle-orm"
import { sqlStatement } from "../../../platform"
import { type CatalogIndexCtx, CatalogIndexError } from "./shared"

/** A resolved filter: match table row id and how many products it matches in the channel. */
export type MatchFilter = { kind: "facet" | "collection"; id: number; count: number }

export type FilterInput = {
  /** Collection `public_id`. */
  collection?: string
  /** `facetCode:valueCode`, all required (AND). */
  facets?: readonly string[]
}

export const MAX_FILTERS = 10
const FACET_REF = /^([a-z0-9_-]{1,64}):([a-z0-9_-]{1,64})$/i

const MATCH = {
  facet: { table: sql.raw("catalog_index_facets"), column: sql.raw("facet_value_id") },
  collection: { table: sql.raw("catalog_index_collections"), column: sql.raw("collection_id") },
} as const

/** `FROM <table> alias WHERE alias.channel_id = ? AND alias.<column> = ?` parts of a filter. */
export function matchTable(f: MatchFilter): { table: SQL; column: SQL } {
  return MATCH[f.kind]
}

/** PK lookup on the match table for the card row `ci`. */
export function existsFilter(f: MatchFilter): SQL {
  const { table, column } = matchTable(f)
  return sql`EXISTS (SELECT 1 FROM ${table} m WHERE m.channel_id = ci.channel_id
    AND m.${column} = ${f.id} AND m.variant_id = ci.variant_id)`
}

/**
 * Public refs → internal ids with their match counts, in one round trip. `null` when a ref is unknown
 * (or a private facet): the filtered result is empty. Counts are covering-index range counts.
 */
export async function resolveFilters(
  ctx: CatalogIndexCtx,
  input: FilterInput,
): Promise<MatchFilter[] | null> {
  const facets = input.facets ?? []
  if (facets.length + (input.collection ? 1 : 0) > MAX_FILTERS) {
    throw new CatalogIndexError("INVALID_INPUT", "çok fazla filtre")
  }
  const channel = ctx.channel.id
  const queries: { kind: MatchFilter["kind"]; query: SQL }[] = facets.map((ref) => {
    const match = FACET_REF.exec(ref)
    if (!match) throw new CatalogIndexError("INVALID_INPUT", `geçersiz filtre: ${ref}`)
    return {
      kind: "facet",
      query: sql`SELECT fv.id, (SELECT count(*) FROM catalog_index_facets m
          WHERE m.channel_id = ${channel} AND m.facet_value_id = fv.id) AS n
        FROM facets f JOIN facet_values fv ON fv.facet_id = f.id
        WHERE f.code = ${match[1]} AND fv.code = ${match[2]} AND f.private = 0`,
    }
  })
  if (input.collection) {
    queries.push({
      kind: "collection",
      query: sql`SELECT c.id, (SELECT count(*) FROM catalog_index_collections m
          WHERE m.channel_id = ${channel} AND m.collection_id = c.id) AS n
        FROM collections c WHERE c.public_id = ${input.collection} AND c.deleted_at IS NULL`,
    })
  }
  if (queries.length === 0) return []
  const results = await ctx.platform.batch(queries.map((q) => sqlStatement(q.query)))
  const out: MatchFilter[] = []
  for (const [i, rows] of results.entries()) {
    const row = rows[0]
    const kind = queries[i]?.kind
    if (!row || !kind) return null
    out.push({ kind, id: Number(row.id), count: Number(row.n) })
  }
  return out
}
