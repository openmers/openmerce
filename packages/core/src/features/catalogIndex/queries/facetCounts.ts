import { sql } from "drizzle-orm"
import { type AtomicStatement, sqlStatement } from "../../../platform"
import { existsFilter, type FilterInput, type MatchFilter, resolveFilters } from "./filters"
import type { CatalogIndexCtx } from "./shared"

export type FacetCount = { facet: string; value: string; count: number }

/**
 * Products per public facet value under the current filters: `GROUP BY facet_value_id` over the channel's
 * PK range of `catalog_index_facets`; the card must exist in the language. Cacheable per segment.
 */
export function facetCountsQuery(input: {
  channelId: number
  lang: string
  filters: readonly MatchFilter[]
}): AtomicStatement {
  const exists = input.filters.map((f) => sql` AND ${existsFilter(f)}`)
  return sqlStatement(sql`SELECT fa.code AS facet, fv.code AS value, count(*) AS n
    FROM catalog_index_facets f
    JOIN catalog_index ci ON ci.channel_id = f.channel_id AND ci.lang = ${input.lang}
      AND ci.variant_id = f.variant_id
    JOIN facet_values fv ON fv.id = f.facet_value_id
    JOIN facets fa ON fa.id = fv.facet_id
    WHERE f.channel_id = ${input.channelId}${sql.join(exists)}
    GROUP BY f.facet_value_id`)
}

export async function facetCounts(
  ctx: CatalogIndexCtx,
  input: FilterInput = {},
): Promise<FacetCount[]> {
  const filters = await resolveFilters(ctx, input)
  if (!filters) return []
  const [rows = []] = await ctx.platform.batch([
    facetCountsQuery({ channelId: ctx.channel.id, lang: ctx.lang, filters }),
  ])
  return rows.map((r) => ({
    facet: r.facet as string,
    value: r.value as string,
    count: Number(r.n),
  }))
}
