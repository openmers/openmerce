import { defineHandlers } from "../../jobs/registry"
import { FULL_REINDEX_EVENT, fullReindexHandler } from "./jobs/fullReindex"
import { reindexProductHandler } from "./jobs/reindexProduct"

export { buildIndexRows } from "./build/buildIndexRows"
export { buildIndex, buildProductView } from "./build/buildProductView"
export { resolveVariantImages } from "./build/resolveVariantImages"
export type { BuiltIndex, ImageRef, IndexRow, ProductSource } from "./build/types"
export {
  FULL_REINDEX_CHUNK,
  FULL_REINDEX_EVENT,
  fullReindexChunk,
  startFullReindex,
} from "./jobs/fullReindex"
export { PRODUCT_VIEW_MAX_BYTES, reindexProduct } from "./jobs/reindexProduct"
export { type FacetCount, facetCounts, facetCountsQuery } from "./queries/facetCounts"
export { type FilterInput, MAX_FILTERS, type MatchFilter } from "./queries/filters"
export { getProductView, getProductViewQuery } from "./queries/getProductView"
export {
  type CatalogSort,
  type ListFilteredInput,
  listCollection,
  listFiltered,
  listFilteredQuery,
} from "./queries/listFiltered"
export { type SearchInput, search, searchQuery } from "./queries/search"
export {
  type CatalogCard,
  type CatalogIndexCtx,
  CatalogIndexError,
  type CatalogPage,
  PAGE_MAX as CATALOG_PAGE_MAX,
} from "./queries/shared"
export type { SearchProvider } from "./search/port"
export { foldText, LANGUAGE_FOLDS, toMatchQuery } from "./text/fold"

/** Outbox handlers of the read model: `reindex(product)` (`product.changed`) and the full reindex chunks. */
export const catalogIndexHandlers = defineHandlers({
  "product.changed": reindexProductHandler,
  [FULL_REINDEX_EVENT]: fullReindexHandler,
})
