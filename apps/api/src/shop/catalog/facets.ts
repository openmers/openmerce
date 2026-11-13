import { facetCounts } from "@openmers/core"
import { base } from "../../orpc/base"
import { rethrowCatalogIndex } from "./errors"

/** `shop.catalog.facets`: product count per public facet value under the given filters. */
export const listCatalogFacets = base.shop.catalog.facets.handler(async ({ input, context }) => ({
  items: await facetCounts(context.ctx, input).catch(rethrowCatalogIndex),
}))
